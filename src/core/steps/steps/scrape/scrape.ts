// scrapeStep.ts

import { ToolStep } from '@core/tools/types'; // Adjust the import path to match your project
import { PlaywrightWebBaseLoader } from '@langchain/community/document_loaders/web/playwright';
import { WebScrapeStepSpec, WebScrapStepOutput } from './types';
// Import your placeholder utility
// Update the path to where you actually keep this function.
import { replacePlaceholders } from '../helper';

/**
 * Default evaluation function for Playwright.
 * Waits for DOM content, removes <style>, <script>, <noscript>, etc.
 * Then returns the page title, meta description, meta keywords,
 * and the entire body text.
 */
async function defaultEvaluate(page: any /* Playwright.Page */) {
  // Wait for DOMContentLoaded or network idle, up to you:
  await page.waitForLoadState('domcontentloaded');

  // Remove <style>, <script>, <noscript>, etc.
  await page.evaluate(() => {
    ['style', 'script', 'noscript'].forEach((tag) => {
      document.querySelectorAll(tag).forEach((el) => el.remove());
    });
  });

  // Return plain text from body plus some meta info
  const text = await page.evaluate(() => {
    const title = document.title ?? '';
    const metaDescription =
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute('content') ?? '';
    const metaKeywords =
      document
        .querySelector('meta[name="keywords"]')
        ?.getAttribute('content') ?? '';

    return (
      `Title: ${title}\n` +
      `Meta Description: ${metaDescription}\n` +
      `Meta Keywords: ${metaKeywords}\n` +
      document.body.innerText
    );
  });

  return text;
}

/**
 * Creates a scrape step that uses PlaywrightWebBaseLoader from LangChain,
 * resolves placeholders in the URL, and returns { docs: [...] }.
 */
export function createScrapeStep(
  spec: WebScrapeStepSpec,
): ToolStep<any, { docs: any[] }> {
  const { loopOn, isLoop, outputNamespace } = spec;

  return {
    // Step loop config if applicable
    loopOn,
    isLoop: isLoop || false,
    outputNamespace,
    conditions: spec.conditions,
    description:
      'Scrapes a web page using Playwright, returning the content in docs',

    func: async (context: any) => {
      console.log('Calling scrape step');
      console.log('context', context);
      console.log('spec', spec);
      // 1) Resolve placeholders in the URL (and other fields if needed)
      const finalSpec = replacePlaceholders(spec, context);

      console.log('finalUrl', finalSpec.url);
      // 2) Create a loader instance using the final URL
      const loader = new PlaywrightWebBaseLoader(finalSpec.url, {
        launchOptions: spec.launchOptions,
        gotoOptions: spec.gotoOptions,
        evaluate: spec.evaluate ?? defaultEvaluate,
      });

      // 3) Load the docs (one doc per page, typically one page in this example)
      console.log('loading docs');
      const docs = await loader.load();

      console.log('docs', docs);
      // 4) Return them in a simple { docs: [...] } object
      return { docs };
    },
  };
}
