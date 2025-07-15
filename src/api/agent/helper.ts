import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { MyChatMessage } from './types';
import { ChatRole } from './enums';

/**
 * Maps ChatMessage[] -> BaseMessage[] for LangChain.
 */
export function toLangChainMessages(
  messages: Partial<MyChatMessage>[],
): BaseMessage[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case ChatRole.HUMAN:
        return new HumanMessage(msg.content.toString());
      case ChatRole.AI:
        return new AIMessage(msg.content.toString());
      default:
        // If you have other roles or system messages, handle them here
        // e.g. return new SystemMessage(msg.content);
        throw new Error(`Unsupported role: ${msg.role}`);
    }
  });
}

/**
 * Converts a single LangChain BaseMessage -> ChatMessage with a timestamp now.
 */
export function fromLangChainMessage(message: BaseMessage): MyChatMessage {
  const content = message.content;
  // Distinguish roles
  if (message.getType() === 'human') {
    return {
      role: ChatRole.HUMAN,
      content,
      timestamp: new Date(),
    };
  } else if (message.getType() === 'ai') {
    return {
      role: ChatRole.AI,
      content,
      timestamp: new Date(),
    };
  }
  // For system or other roles, handle similarly
  throw new Error(`Unsupported message type: ${message.getType()}`);
}
