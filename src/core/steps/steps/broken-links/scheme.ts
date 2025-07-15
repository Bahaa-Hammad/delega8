import { z } from 'zod';
import {
  placeholderFriendlyString,
  placeholderFriendlyNumber,
  placeholderFriendlyBoolean,
  placeholderFriendlyEnum,
} from '../scheme-placeholders';

export const brokenLinksStepSchema = z.object({
  type: z.literal('brokenLinks'),
  url: placeholderFriendlyString,
  depth: placeholderFriendlyNumber.optional(),
  sameDomainOnly: placeholderFriendlyBoolean.optional(),
  maxPages: placeholderFriendlyNumber.optional(),
  concurrency: placeholderFriendlyNumber.optional(),
  waitUntil: placeholderFriendlyEnum([
    'domcontentloaded',
    'networkidle',
    'load',
    'commit',
  ]).optional(),
  waitForSelector: placeholderFriendlyString.optional(),
});
