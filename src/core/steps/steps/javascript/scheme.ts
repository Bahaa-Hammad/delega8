import { z } from 'zod';
import { placeholderFriendlyString } from '../scheme-placeholders';

export const javascriptStepSchema = z.object({
  type: z.literal('javascript'),
  code: placeholderFriendlyString,
});

export const javascriptStepOutputSchema = z.object({
  result: z.any(),
});
