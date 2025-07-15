import { LlmProviders } from '@src/common/llm/enums';
import { LlmStepSpec } from '@src/core/steps/steps/llm/types';
import { WebScrapeStepSpec } from '@src/core/steps/steps/scrape/types';
import { YouTubeStepSpec } from '@src/core/steps/steps/youtube/types';

export const helloUsernameStep: LlmStepSpec = {
  type: 'llm',
  name: 'Hello Username Step',
  promptTemplate: 'Hello, {userName}. How may I help you?',
  model: {
    provider: LlmProviders.OPENAI,
    name: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 256,
  },
  isLoop: false,
  loopOn: undefined,
  outputNamespace: 'helloOutput',
  conditions: [],
};

export const byeUsernameStep: LlmStepSpec = {
  type: 'llm',
  name: 'Bye Username Step',
  promptTemplate: 'Bye, {userName}.',
  model: {
    provider: LlmProviders.OPENAI,
    name: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 256,
  },
  outputNamespace: 'byeOutput',
};

export const youtubeTranscriptStep: YouTubeStepSpec = {
  type: 'youtube',
  url: '{url}',
  outputNamespace: 'youtubeOutput',
  conditions: [],
  isLoop: false,
  loopOn: undefined,
};

export const llmStepWithScrape: LlmStepSpec = {
  type: 'llm',
  name: 'LLM Step with Scrape',
  promptTemplate: 'summarize {loopValue.pageContent}',
  model: {
    provider: LlmProviders.OPENAI,
    name: 'gpt-3.5-turbo',
    temperature: 0.7,
  },
  outputNamespace: 'llmOutput',
  isLoop: true,
  loopOn: 'youtubeOutput.docs',
};

export const llmStepWithConditions: LlmStepSpec = {
  type: 'llm',
  name: 'LLM Step with Conditions',
  promptTemplate: 'say hello if you arrived',
  model: {
    provider: LlmProviders.OPENAI,
    name: 'gpt-3.5-turbo',
    temperature: 0.7,
  },
  outputNamespace: 'llmOutput',
  conditions: [
    {
      field: 'shouldSayHello',
      value: true,
      operator: 'equals',
    },
  ],
};

export const llmStepWithStructuredOutput: LlmStepSpec = {
  type: 'llm',
  name: 'LLM Step with Structured Output',
  promptTemplate:
    'Can you give me the age of Michael Jackson when he was born and his father name',
  model: {
    provider: LlmProviders.OPENAI,
    name: 'gpt-3.5-turbo',
    temperature: 0.7,
  },
  outputNamespace: 'llmOutput',
  structuredOutputSpec: [
    {
      name: 'age',
      type: 'number',
      description: 'The age of michael jackson when he was born',
    },
    {
      name: 'fatherName',
      type: 'string',
      description: 'The father name of michael jackson',
    },
  ],
};
