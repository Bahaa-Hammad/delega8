import { z } from 'zod';
import { placeholderFriendlyString } from '../scheme-placeholders';
export const llmStepSchema = z.object({
  type: z.literal('llm'),
  name: placeholderFriendlyString,
  promptTemplate: placeholderFriendlyString,
  structuredOutput: z.record(z.any()).optional(),
  // Add additional LLM-specific fields if necessary
});
