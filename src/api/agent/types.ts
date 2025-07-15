import { MessageContentComplex } from '@langchain/core/messages';
import { ChatRole } from './enums';

export interface MyChatMessage {
  role: ChatRole;
  content: string | MessageContentComplex;
  timestamp: Date;
}

export interface ChatBodySpec {
  messages: Partial<MyChatMessage>[];
  chatId?: string;
  mode?: ChatMode;
}

export interface StateType {
  messages: MyChatMessage[]; // You can replace 'any' with a more specific type if you know the structure of messages
  instructions: string;
  next: string;
}

export enum ChatMode {
  REPLY = 'reply',
  CHAT = 'chat',
}

export enum AgentType {
  USER = 'USER',
  TEMPLATE = 'TEMPLATE',
}

export enum AgentStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PUBLISHED = 'PUBLISHED',
}
