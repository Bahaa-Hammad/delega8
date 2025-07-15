import { z } from 'zod';
import {
  placeholderFriendlyString,
  placeholderFriendlyBoolean,
} from '../scheme-placeholders';

export const youtubeStepSchema = z.object({
  type: z.literal('youtube'),
  url: placeholderFriendlyString,
  language: placeholderFriendlyString.optional(),
  addVideoInfo: placeholderFriendlyBoolean.optional(),
});
