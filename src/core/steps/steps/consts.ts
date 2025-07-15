import { apiStepSchema } from './api/scheme';
import { youtubeStepSchema } from './youtube/scheme';
import {
  javascriptStepOutputSchema,
  javascriptStepSchema,
} from './javascript/scheme';
import { webScrapeStepSchema } from './scrape/scheme';
import { brokenLinksStepSchema } from './broken-links/scheme';
import { llmStepSchema } from './llm/scheme';
import { llmStepOutputSchema } from './llm/types';
import { apiStepOutputSchema } from './api/types';
import { youtubeStepOutputSchema } from './youtube/types';
import { webScrapStepOutputSchema } from './scrape/types';
import { brokenLinksStepOutputSchema } from './broken-links/types';

export const stepSchemaMap = {
  llm: {
    input: llmStepSchema,
    output: llmStepOutputSchema,
  },
  api: {
    input: apiStepSchema,
    output: apiStepOutputSchema,
  },
  youtube: {
    input: youtubeStepSchema,
    output: youtubeStepOutputSchema,
  },
  javascript: {
    input: javascriptStepSchema,
    output: javascriptStepOutputSchema,
  },
  scrape: {
    input: webScrapeStepSchema,
    output: webScrapStepOutputSchema,
  },
  brokenLinks: {
    input: brokenLinksStepSchema,
    output: brokenLinksStepOutputSchema,
  },
} as const;
