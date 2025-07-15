import { BaseStepSpec } from '@core/steps/types';
import { z } from 'zod';

export interface WebScrapeStepSpec extends BaseStepSpec {
  type: 'scrape'; // for your union discriminator

  url: string; // The webpage URL
  // Optional advanced Playwright config
  launchOptions?: {
    headless?: boolean;
    // other LaunchOptions...
  };
  gotoOptions?: {
    waitUntil?: 'domcontentloaded' | 'networkidle' | 'load' | 'commit';
    timeout?: number;
    // other GotoOptions...
  };
  // Evaluate function if you want custom scraping logic
  // But keep it optional for now
  evaluate?: (page: any, browser: any, response: any) => Promise<string>;
}

export interface WebScrapStepOutput {
  docs: Document[];
}

export const webScrapStepOutputSchema = z.object({
  docs: z.array(z.any()),
});
