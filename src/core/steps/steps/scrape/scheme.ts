import { z } from 'zod';
import {
  placeholderFriendlyString,
  placeholderFriendlyBoolean,
  placeholderFriendlyEnum,
  placeholderFriendlyNumber,
} from '../scheme-placeholders';

export const webScrapeStepSchema = z.object({
  type: z.literal('scrape'),
  url: placeholderFriendlyString,
  launchOptions: z
    .object({
      headless: placeholderFriendlyBoolean.optional(),
      // add other Playwright LaunchOptions if needed
    })
    .optional(),
  gotoOptions: z
    .object({
      waitUntil: placeholderFriendlyEnum([
        'domcontentloaded',
        'networkidle',
        'load',
        'commit',
      ]).optional(),
      timeout: placeholderFriendlyNumber.optional(),
      // add other GotoOptions if needed
    })
    .optional(),
});
