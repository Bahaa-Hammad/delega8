import { AgentEntity } from '@agents/entities/agent.entity';
import { ChatEntity } from '@agents/entities/chats.entity';
import { ChatMode } from '@agents/types';
import { ChatBodySpec } from '@agents/types';
import { MyChatMessage } from '@agents/types';
import { createCompiledGraphO } from '@core/agents/builder';
import { NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentService } from './agent.service';
import { toAgentSpec } from '@agents/transformer';
import { fromLangChainMessage, toLangChainMessages } from '@agents/helper';
import { AIMessage, BaseMessage } from '@langchain/core/messages';
import { ChatRole } from '@agents/enums';
import { ConsolidateLogsToSingleAnswerTool } from './helper';

export class ChatsService {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,
    @InjectRepository(AgentEntity)
    private readonly agentRepository: Repository<AgentEntity>,
    private readonly agentService: AgentService,
  ) {}

  private async getOrCreateChat(
    agent: AgentEntity,
    userId: string,
    chatId?: string,
  ): Promise<ChatEntity> {
    if (!chatId) {
      // No chatId provided -> create new chat
      const newChat = new ChatEntity();
      newChat.agent = agent; // Set the agent relationship
      return this.chatRepository.save(newChat);
    }

    // If chatId was provided, try to find existing
    let chat = await this.chatRepository.findOne({
      where: { id: chatId, agent: { id: agent.id } },
    });

    // If the chat doesn't exist, create a new one
    if (!chat) {
      chat = new ChatEntity();
      chat.agent = agent; // Set the agent relationship
      return this.chatRepository.save(chat);
    }

    return chat;
  }

  async chatWithAgent(
    agentId: string,
    chatBodySpec: ChatBodySpec,
    userId: string,
  ): Promise<{ messages: MyChatMessage[]; chatId: string }> {
    // 1. Load agent with existing chats

    const agent = await this.agentService.findWithAllChildren(
      agentId,
      userId,
      new Set(),
      ['chats'],
    );

    console.log('agent');
    let mode = chatBodySpec.mode || ChatMode.CHAT;
    if (!agent) {
      throw new NotFoundException(`AgentEntity with ID "${agentId}" not found`);
    }
    // 2. Retrieve or create the chat
    let chat = await this.getOrCreateChat(agent, userId, chatBodySpec.chatId);
    // 3. Attach the chat to agent if not already there
    //    - helps if you want to see the agent -> chat relationship
    //    - optional if your logic doesn't require it
    const existingChat = agent.chats?.find((c) => c.id === chat.id);
    console.log('Existing chat', existingChat);
    const chatExistsInAgent = existingChat !== undefined;
    if (!chatExistsInAgent) {
      agent.chats = [...(agent.chats || []), chat];
      await this.agentRepository.save(agent);
    }

    const spec = toAgentSpec(agent);
    const agentGraph = await createCompiledGraphO(spec);
    const drawableGraph = await agentGraph.getGraphAsync();

    const userMessages: MyChatMessage[] = chatBodySpec.messages.map((m) =>
      this.toFullMessage(m),
    );

    // ChatEntity invoke the model with the chat from specs
    // reply mode: just use the messages from the spec and append to existing chat

    const lcMessages: BaseMessage[] =
      mode === ChatMode.CHAT
        ? toLangChainMessages(chatBodySpec.messages)
        : toLangChainMessages([
            ...(existingChat?.messages || []),
            ...chatBodySpec.messages,
          ]);

    console.log('lcMessages', lcMessages);

    // 5. Build the initial state object. You can override or extend as needed.
    const initialState = {
      messages: lcMessages,
      instructions: '', // or some value
      next: '',
      team_members: [],
      runtimeContext: {},
      // other fields you want your graph to see...
    };

    console.log('initialState', initialState);
    // Process the conversation state through your agent graph
    let result: any;

    try {
      result = await agentGraph.invoke(initialState);
    } catch (error) {
      console.error('Error invoking the graph:', error);
    }

    console.log('logs', JSON.stringify(result.runtimeContext?.executionLogs));
    const messages = result.messages as BaseMessage[];
    const resultMessages = messages.map((m) => {
      return {
        content: m.content,
      };
    });
    console.log('resultMessages', resultMessages);
    console.log(
      'jsonOutputs',
      JSON.stringify(result.runtimeContext?.jsonOutputs),
    );
    // We'll assume result.messages is the final list of messages.
    const messagesPure = result.messages as BaseMessage[];
    const lastMessage = messagesPure[messagesPure.length - 1];

    // Create an AI message from the last message content
    const messageToUser = await ConsolidateLogsToSingleAnswerTool.run({
      logs: result.runtimeContext.jsonOutputs,
    });
    const aiMessage = new AIMessage({ content: messageToUser });
    const aiReply = fromLangChainMessage(aiMessage);

    const effectiveChatMessages =
      mode === ChatMode.CHAT
        ? [...userMessages, aiReply]
        : [
            ...(existingChat?.messages || []),
            ...chatBodySpec.messages,
            aiReply,
          ];
    // 6. Update the conversation in the ChatEntity entity
    const updatedConversation = effectiveChatMessages.map((m) =>
      this.toFullMessage(m),
    );

    chat.messages = updatedConversation;
    chat = await this.chatRepository.save(chat);

    // Return the updated conversation to the caller

    return {
      messages: updatedConversation,
      chatId: chat.id,
    };
  }

  async getChats(userId: string, agentId: string): Promise<ChatEntity[]> {
    return this.chatRepository.find({
      where: { agent: { id: agentId, user: { id: userId } } },
    });
  }

  private toFullMessage(partial: Partial<MyChatMessage>): MyChatMessage {
    return {
      role: partial.role ?? ChatRole.HUMAN,
      content: partial.content ?? '',
      timestamp: partial.timestamp ?? new Date(),
    };
  }

  async getChat(
    userId: string,
    agentId: string,
    chatId: string,
  ): Promise<ChatEntity> {
    return this.chatRepository.findOne({
      where: { id: chatId, agent: { id: agentId, user: { id: userId } } },
    });
  }
}
