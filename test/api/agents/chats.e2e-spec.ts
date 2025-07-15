import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getApp, getUserTokens } from '../../setupAfterEnv';
import { ChatMode } from '@agents/types';
import { LlmProviders } from '@src/common/llm/enums';

describe('Agent Chats (E2E)', () => {
  let app: INestApplication;
  let userAccessToken: string;

  let createdAgentId: string;
  let createdToken: string;

  let createdChatId: string; // to store the chat ID from the first chat

  beforeAll(() => {
    // 1) Retrieve your app from the global test context
    app = getApp();

    // 2) Retrieve normal user token (for JwtAuthGuard tests)
    const { accessToken } = getUserTokens();
    userAccessToken = accessToken;

    // Increase test timeout if needed
    jest.setTimeout(30000);
  });

  it('1) Create a simple agent', async () => {
    // We create a minimal agent for testing chats
    const payload = {
      name: 'ChatTestAgent',
      description: 'An agent for testing chat features',
      coreInstructions: 'You are a helpful assistant.',
      model: {
        provider: LlmProviders.OPENAI,
        name: 'gpt-3.5-turbo',
        temperature: 0.7,
      },
    };
    const createRes = await request(app.getHttpServer())
      .post('/agents')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(payload)
      .expect(201);

    createdAgentId = createRes.body.id;
    expect(createdAgentId).toBeDefined();
    expect(createRes.body.name).toBe('ChatTestAgent');
  });

  it('2) Chat with the agent in CHAT mode (user token)', async () => {
    // We'll provide a single user message
    const chatPayload = {
      messages: [
        {
          role: 'HUMAN',
          content: 'Hello, agent! This is a user message in CHAT mode.',
        },
      ],
      // mode defaults to ChatMode.CHAT if not provided,
      // but we'll be explicit
      mode: ChatMode.CHAT,
    };

    // POST /agents/:agentId/chats
    const chatRes = await request(app.getHttpServer())
      .post(`/agents/${createdAgentId}/chats`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(chatPayload)
      .expect(201); // or 200, depending on your code

    expect(chatRes.body.chatId).toBeDefined();
    createdChatId = chatRes.body.chatId;

    // We expect the messages array to contain at least the user message + AI reply
    expect(Array.isArray(chatRes.body.messages)).toBe(true);
    expect(chatRes.body.messages.length).toBeGreaterThanOrEqual(2);

    // The last message is presumably an AI reply
    const lastMessage = chatRes.body.messages[chatRes.body.messages.length - 1];
    expect(lastMessage.role).toBe('AI');
  });

  it('3) Retrieve the list of chats, then get the chat by ID', async () => {
    // GET /agents/:agentId/chats
    const listRes = await request(app.getHttpServer())
      .get(`/agents/${createdAgentId}/chats`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    // We expect 1 chat so far
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBe(1);
    expect(listRes.body[0].id).toBe(createdChatId);

    // Then GET /agents/:agentId/chats/:chatId
    const singleRes = await request(app.getHttpServer())
      .get(`/agents/${createdAgentId}/chats/${createdChatId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    // Should match the conversation from step 2
    const chat = singleRes.body;
    expect(chat.id).toBe(createdChatId);
    expect(Array.isArray(chat.messages)).toBe(true);
    // The last message is presumably AI
    const lastMsg = chat.messages[chat.messages.length - 1];
    expect(lastMsg.role).toBe('AI');
  });

  it('4) Create an API token for the agent (for token-based chat)', async () => {
    // user => POST /agents/:id/tokens
    const tokenRes = await request(app.getHttpServer())
      .post(`/agents/${createdAgentId}/tokens`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(201);

    createdToken = tokenRes.body.token;
    expect(createdToken).toBeDefined();
  });

  it('5) Chat with the agent via API token in REPLY mode', async () => {
    const chatPayload = {
      // We'll send some new user messages
      messages: [
        {
          role: 'HUMAN',
          content: 'Hello again, agent. Now in REPLY mode with token!',
        },
      ],
      // we specify the same chatId => or a brand new chat?
      // let's re-use the same chat so we can see how REPLY differs
      chatId: createdChatId,
      mode: ChatMode.REPLY,
    };

    // POST /agents/:agentId/chats/with-token
    const chatRes = await request(app.getHttpServer())
      .post(`/agents/${createdAgentId}/chats/with-token`)
      .set('x-api-key', createdToken)
      .send(chatPayload)
      .expect(201); // or 200

    // Expect the messages array to have updated. In REPLY mode, you said
    // the code merges existing chat messages with the new messages differently
    // or replaces them, depending on your logic.
    // If your code "just appends" or "replace," adjust your tests accordingly.

    expect(chatRes.body.chatId).toBe(createdChatId);
    expect(Array.isArray(chatRes.body.messages)).toBe(true);
    const lastMsg = chatRes.body.messages[chatRes.body.messages.length - 1];
    // The last one presumably is AI
    expect(lastMsg.role).toBe('AI');
  });

  it('6) Verify the final conversation after REPLY mode', async () => {
    // We'll do a GET /agents/:agentId/chats/:chatId again to see the entire conversation
    const singleRes = await request(app.getHttpServer())
      .get(`/agents/${createdAgentId}/chats/${createdChatId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    const chat = singleRes.body;
    // If your code replaced prior messages in REPLY mode,
    // the array might only contain the new user message + AI reply
    // If your code appended, the array might have more.
    // We'll just check that the last message is AI from the REPLY step.
    const lastMsg = chat.messages[chat.messages.length - 1];
    expect(lastMsg.role).toBe('AI');
    // Possibly check that the second to last is user or whatever logic you have.
  });
});
