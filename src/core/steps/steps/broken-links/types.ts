import { BaseStepSpec } from '@core/steps/types';
import { z } from 'zod';
export interface BrokenLinksStepSpec extends BaseStepSpec {
  type: 'brokenLinks';
  url: string;
  /** How many link-levels (edges) to traverse. Defaults to 1 (just the starting page). */
  depth?: number;
  /** Restrict crawling to the same domain as the starting URL? Defaults to true. */
  sameDomainOnly?: boolean;
  /** Limit total number of pages visited to avoid huge crawls. Defaults to 50. */
  maxPages?: number;
  /** Maximum concurrent page visits. Defaults to 3. */
  concurrency?: number;
  /** How to wait before capturing links. "domcontentloaded", "networkidle", or "load". Defaults to "networkidle". */
  waitUntil?: 'domcontentloaded' | 'networkidle' | 'load' | 'commit';
  /** If the site is heavily dynamic, you may want to wait for a specific selector to appear. e.g. 'body', 'main', or 'a'. */
  waitForSelector?: string;
}

export interface BrokenLink {
  parentPage: string;
  link: string;
  statusCode?: number;
  reason?: string;
}

export const brokenLinkSchema = z.object({
  parentPage: z.string(),
  link: z.string(),
  statusCode: z.number().optional(),
  reason: z.string().optional(),
});

export const brokenLinksStepOutputSchema = z.array(brokenLinkSchema);
