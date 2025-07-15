import { ToolStep } from '@core/tools/types';
import { createLlmStepDirect } from './llm/llm';
import { createYouTubeTranscriptStep } from './youtube/youtube';
import { createJavaScriptStep } from './javascript/javascript';
import { createScrapeStep } from './scrape/scrape';
import { createBrokenLinksStep } from './broken-links/broken-links';
import { createApiStepDirect } from './api/api';
import { StepSpec } from '@core/steps/types';
import { YouTubeStepSpec } from './youtube/types';
import { ApiStepSpec } from './api/types';
import { LlmStepSpec } from './llm/types';
import { WebScrapeStepSpec } from './scrape/types';
import { BrokenLinksStepSpec } from './broken-links/types';
import { JavaScriptStepSpec } from './javascript/types';
import { Context } from '@core/types';

const stepFactories: Record<
  string,
  (config: StepSpec) => ToolStep<Context, Context>
> = {
  api: (config: StepSpec) => createApiStepDirect(config as ApiStepSpec),
  llm: (config: StepSpec) => createLlmStepDirect(config as LlmStepSpec),
  youtube: (config: StepSpec) =>
    createYouTubeTranscriptStep(config as YouTubeStepSpec),
  javascript: (config: StepSpec) =>
    createJavaScriptStep(config as JavaScriptStepSpec),
  scrape: (config: StepSpec) => createScrapeStep(config as WebScrapeStepSpec),
  brokenLinks: (config: StepSpec) =>
    createBrokenLinksStep(config as BrokenLinksStepSpec),
};

export function createStepFromConfig(stepConfig: StepSpec): ToolStep<any, any> {
  const factory = stepFactories[stepConfig.type];
  if (!factory) {
    throw new Error(`Unsupported step type: ${stepConfig.type}`);
  }
  return factory(stepConfig);
}
