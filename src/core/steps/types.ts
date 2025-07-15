import { ApiStepSpec } from './steps/api/types';
import { LlmStepSpec } from './steps/llm/types';
import { YouTubeStepSpec } from './steps/youtube/types';
import { JavaScriptStepSpec } from './steps/javascript/types';
import { WebScrapeStepSpec } from './steps/scrape/types';
import { BrokenLinksStepSpec } from './steps/broken-links/types';

export type StepBuilderFn = (step: any) => StepSpec;

interface StepCondition {
  field: string; // e.g. "availability"
  operator:
    | 'equals'
    | 'does_not_equal'
    | 'is_less_than'
    | 'is_greater_than'
    | 'is_less_than_or_equal_to'
    | 'is_greater_than_or_equal_to';
  // Add more operators as needed
  value: any; // e.g. "available", 10, etc.
  join?: 'and' | 'or'; // "and" or "or" to chain with next condition
}

export interface BaseStepSpec {
  isLoop?: boolean;
  loopOn?: string;
  outputNamespace: string;
  conditions?: StepCondition[];
}

export type StepSpec =
  | ApiStepSpec
  | LlmStepSpec
  | YouTubeStepSpec
  | JavaScriptStepSpec
  | WebScrapeStepSpec
  | BrokenLinksStepSpec;
