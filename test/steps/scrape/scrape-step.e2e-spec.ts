import { createScrapeStep } from '@src/core/steps/steps/scrape/scrape';
import { sampleScrapeStep } from './scrape-samples';

// TODO: fix this test, it require ram
describe.skip('Scrape Step (e2e)', () => {
  // Increase test timeout if real network calls might be slow
  beforeAll(() => {
    jest.setTimeout(30_000); // e.g. 30s
  });

  it('should scrape a webpage and return docs', async () => {
    // 1) Create the step from sampleScrapeStep
    const scrapeStep = createScrapeStep(sampleScrapeStep);

    const context = {
      inputs: { url: 'https://google.com' },
    };

    // 3) Invoke the step
    const result = await scrapeStep.func(context);

    // 4) Check the result shape
    expect(result).toHaveProperty('docs');
    expect(Array.isArray(result.docs)).toBe(true);
  });
});
