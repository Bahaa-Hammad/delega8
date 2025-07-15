import { z } from 'zod';
import { placeholderFriendlyString } from '@core/steps/steps/scheme-placeholders';

export const apiStepSchema = z.object({
  type: z.literal('api'),
  name: placeholderFriendlyString,
  verb: placeholderFriendlyString,
  baseUrl: placeholderFriendlyString,
  headers: z.record(placeholderFriendlyString).optional(),
  body: z.record(z.any()).optional(),
  query: z.record(z.any()).optional(),
});
