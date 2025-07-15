import { LlmProviders } from 'src/common/llm/enums';
import { BaseStepSpec } from '@core/steps/types';
import { z } from 'zod';
import { FieldSpec } from '@src/core/types';
export interface LlmStepOutput {
  answer?: string;
  structuredData?: Record<string, any>;
}

export interface LlmModel {
  provider: LlmProviders;
  name: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  maxRetries?: number;
}
export interface LlmStepSpec extends BaseStepSpec {
  type: 'llm';
  name: string;
  promptTemplate: string;
  model: LlmModel;
  structuredOutputSpec?: FieldSpec[] | null;
}

export const llmStepOutputSchema = z.object({
  answer: z.string().optional(),
  structuredData: z.record(z.any()).optional(),
});
