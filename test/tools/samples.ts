import { CompositeToolConfigSpec } from '@core/tools/types';

import {
  byeUsernameStep,
  helloUsernameStep,
  llmStepWithConditions,
  llmStepWithScrape,
  youtubeTranscriptStep,
} from '@test/steps/llm/llm-samples';

export const helloToolConfig: CompositeToolConfigSpec = {
  id: 'my-sample-tool',
  name: 'HelloTool',
  description: 'A tool that runs an LLM step to greet the user',
  fields: [
    {
      name: 'userName',
      type: 'string',
      description: 'The user name to greet',
    },
  ],
  steps: [helloUsernameStep],
};

export const byeToolConfig: CompositeToolConfigSpec = {
  id: 'my-sample-tool',
  name: 'ByeTool',
  description: 'A tool that runs an LLM step to greet the user',
  fields: [
    {
      name: 'userName',
      type: 'string',
      description: 'The user name to say bye to',
    },
  ],
  steps: [byeUsernameStep],
};

export const toolWithMultipleSteps: CompositeToolConfigSpec = {
  id: 'my-sample-tool',
  name: 'SampleTool',
  description: 'A tool that runs multiple steps',
  fields: [
    {
      name: 'userName',
      type: 'string',
      description: 'The user name to greet',
    },
  ],
  steps: [helloUsernameStep, byeUsernameStep],
};

export const toolWithLoop: CompositeToolConfigSpec = {
  id: 'my-sample-tool',
  name: 'SampleTool',
  description: 'A tool that runs a loop',
  fields: [
    {
      name: 'url',
      type: 'string',
      description: 'The URL to scrape',
    },
  ],
  steps: [youtubeTranscriptStep, llmStepWithScrape],
};

export const toolWithConditions: CompositeToolConfigSpec = {
  id: 'my-sample-tool',
  name: 'SampleTool',
  description: 'A tool that runs a loop',
  fields: [
    {
      name: 'shouldSayHello',
      type: 'boolean',
      description: 'Whether to say hello',
    },
  ],
  steps: [llmStepWithConditions],
};
