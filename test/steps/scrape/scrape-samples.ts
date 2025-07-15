import { WebScrapeStepSpec } from '@src/core/steps/steps/scrape/types';

export const sampleScrapeStep: WebScrapeStepSpec = {
  type: 'scrape',
  url: '{url}', // or any site you want to scrape
  // If you have placeholders (like "{{url}}"), add them here and pass them in via context
  launchOptions: {
    headless: true,
  },
  gotoOptions: {
    waitUntil: 'domcontentloaded',
    timeout: 15000,
  },
  isLoop: false,
  loopOn: undefined,
  outputNamespace: 'scrapeDocs',
  conditions: [],
};
