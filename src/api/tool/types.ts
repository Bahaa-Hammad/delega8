import { CreateToolDto } from './dto/create-tool.dto';

export enum ToolInvocationStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

export interface ToolInvocationResult {
  status: ToolInvocationStatus;
  error?: string;
}

export enum ToolType {
  USER = 'USER',
  TEMPLATE = 'TEMPLATE',
}

export enum ToolPublishStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PUBLISHED = 'PUBLISHED',
}

export interface ToolInvokeOnFly {
  input: any;
  toolDefinition: CreateToolDto;
}
