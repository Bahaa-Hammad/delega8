import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { LLMFactoryOptions } from './types';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { LlmProviders } from './enums';
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// TODO: add support for other providers
// TODO: put default model in database

export function createLLMOrDefault(options: LLMFactoryOptions): BaseChatModel {
  if (!options || !options.provider) {
    console.log('No provider provided, using default model');
    return new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
    });
  }

  const {
    provider,
    modelName,
    temperature = 0.2,
    topP,
    topK,
    presencePenalty,
    frequencyPenalty,
    streaming,
    maxTokens,
    apiKey,
    maxRetries,
    // ... catch any leftover spread if needed
  } = options;

  // Sanity checks and fallbacks
  const safeModelName = modelName || defaultModelForProvider(provider);
  const safeApiKey = apiKey || getApiKeyFromEnv(provider);

  if (!safeApiKey) {
    throw new Error(
      `Missing API key for ${provider}. Please provide it explicitly or via environment variable.`,
    );
  }

  const filteredParams = Object.fromEntries(
    Object.entries(options).filter(([_, value]) => value !== null),
  );
  console.log('filteredParams', filteredParams);
  switch (provider) {
    case LlmProviders.OPENAI: {
      /**
       * For ChatOpenAI, note the constructor supports:
       *   - apiKey
       *   - modelName
       *   - temperature
       *   - topP
       *   - presencePenalty
       *   - frequencyPenalty
       *   - streaming
       *   - maxTokens
       *   - concurrency & caching config, etc.
       * Adjust as needed; some params might differ in naming or usage.
       */
      // filter null values

      return new ChatOpenAI({
        ...filteredParams,
        maxRetries: maxRetries || 3,
        temperature: temperature || 0.2,
      });
    }

    case LlmProviders.ANTHROPIC: {
      /**
       * For ChatAnthropic, the constructor might differ:
       *   - apiKey
       *   - modelName
       *   - temperature
       *   - topK
       *   - topP
       *   - maxTokensToSample (Anthropic uses a different property name for maxTokens)
       */
      return new ChatAnthropic({});
    }

    case LlmProviders.DEEPSEEK: {
      return new ChatDeepSeek({
        ...filteredParams,
      });
    }

    case LlmProviders.GOOGLE: {
      return new ChatGoogleGenerativeAI({
        ...filteredParams,
      });
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * An example helper function to return a default model if the user did not specify modelName.
 */
function defaultModelForProvider(provider: LlmProviders): string {
  switch (provider) {
    case LlmProviders.OPENAI:
      return 'gpt-4o';
    case LlmProviders.ANTHROPIC:
      return 'claude-v1';
    case LlmProviders.DEEPSEEK:
      return 'deepseek-default-model';
    case LlmProviders.GOOGLE:
      return 'gemini-1.5-flash';
    default:
      throw new Error(`No default model specified for provider ${provider}`);
  }
}

/**
 * Example: each provider can have a different environment variable name for the API key.
 */
function getApiKeyFromEnv(provider: LlmProviders): string | undefined {
  switch (provider) {
    case LlmProviders.OPENAI:
      return process.env.OPENAI_API_KEY;
    case LlmProviders.ANTHROPIC:
      return process.env.ANTHROPIC_API_KEY;
    case LlmProviders.DEEPSEEK:
      return process.env.DEEPSEEK_API_KEY;
    default:
      return undefined;
  }
}
