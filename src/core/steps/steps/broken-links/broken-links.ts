import { ToolStep } from '@core/tools/types';
import { BrokenLinksStepSpec, BrokenLink } from './types';
// Crawlee + Playwright
import { PlaywrightCrawler } from '@crawlee/playwright';

/** Perform HEAD with fallback to GET. */
async function checkLink(linkUrl: string) {
  try {
    let resp = await fetch(linkUrl, { method: 'HEAD' });
    if (!resp.ok && resp.status === 405) {
      resp = await fetch(linkUrl, { method: 'GET' });
    }
    if (!resp.ok) {
      return {
        broken: true,
        statusCode: resp.status,
        reason: `Non-OK status: ${resp.status}`,
      };
    }
    return { broken: false, statusCode: resp.status };
  } catch (err: any) {
    return { broken: true, reason: err.message || 'Network error' };
  }
}

export function createBrokenLinksStep(
  spec: BrokenLinksStepSpec,
): ToolStep<any, BrokenLink[]> {
  const { loopOn, isLoop, outputNamespace } = spec;
  return {
    loopOn,
    isLoop: isLoop || false,
    outputNamespace,
    description:
      'Crawls pages using Crawlee + Playwright, checking for broken links, with a manual BFS depth limit.',
    func: async (context: any) => {
      const {
        url,
        depth = 1, // BFS depth limit
        maxPages = 50, // total pages limit
        concurrency = 3,
        sameDomainOnly = true,
      } = spec;

      const brokenLinks: BrokenLink[] = [];

      // Create a PlaywrightCrawler with the concurrency & total pages limit
      const crawler = new PlaywrightCrawler({
        maxConcurrency: concurrency,
        maxRequestsPerCrawl: maxPages,
        // You could also adjust navigationTimeoutSecs, requestHandlerTimeoutSecs, etc.

        // This function handles each page
        async requestHandler({ request, page, enqueueLinks, log }) {
          // "depth" is tracked in request.userData
          const currentDepth: number = request.userData.depth ?? 0;

          log.info(`Processing: ${request.url}, depth=${currentDepth}`);

          // 1) Gather <a> hrefs
          const anchors = await page.$$eval('a', (els) =>
            els.map((el) => (el as HTMLAnchorElement).href),
          );
          log.info(`Found ${anchors.length} links on ${request.url}`);

          // 2) Check each link for broken status
          for (const link of anchors) {
            if (!/^https?:\/\//i.test(link)) {
              continue; // skip mailto:, javascript:, etc.
            }
            const { broken, statusCode, reason } = await checkLink(link);
            if (broken) {
              brokenLinks.push({
                parentPage: request.url,
                link,
                statusCode,
                reason,
              });
            }
          }

          // 3) Enqueue next-level links (if currentDepth < depth)
          if (currentDepth < depth) {
            await enqueueLinks({
              selector: 'a',
              // Only same-domain if specified
              strategy: sameDomainOnly ? 'same-domain' : 'all',
              // Use transformRequestFunction to store an incremented depth
              transformRequestFunction: (enqueuedRequest) => {
                // We only want to enqueue if next depth <= depth
                const nextDepth = currentDepth + 1;
                if (nextDepth > depth) {
                  return null; // skip
                }
                // Set userData.depth so we know how deep this request is
                enqueuedRequest.userData.depth = nextDepth;
                return enqueuedRequest;
              },
            });
          }
        },

        // If a page fails to load entirely:
        async failedRequestHandler({ request, error, log }) {
          brokenLinks.push({
            parentPage: '(root)',
            link: request.url,
            reason: (error as string) || 'Page load error',
          });
          log.warning(`Page failed: ${request.url}. Reason: ${error}`);
        },
      });

      // Start by adding an initial request with depth=0
      await crawler.run([
        {
          url,
          userData: { depth: 1 }, // crucial to track BFS levels
        },
      ]);

      const uniqueBrokenLinks = brokenLinks.filter(
        (link, index, self) =>
          index === self.findIndex((t) => t.link === link.link),
      );
      return uniqueBrokenLinks;
    },
  };
}
