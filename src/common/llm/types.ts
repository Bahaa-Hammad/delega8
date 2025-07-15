import { LlmProviders } from './enums';

export interface BaseLLMOptions {
  /** The provider to use (OpenAI, Anthropic, etc.) */
  provider: LlmProviders;

  /**
   * The model name (e.g., "gpt-3.5-turbo", "gpt-4", "claude-v1", etc.)
   * Always required if you do not want to rely on default model names.
   */
  modelName?: string;

  /** Control randomness (0.0 is most deterministic, higher is more creative) */
  temperature?: number;

  /** Nucleus sampling: picks from tokens whose cumulative probability is <= topP. */
  topP?: number;

  /**
   * For providers that have a topK parameter.
   * (Anthropic’s version is topK, other LLMs might differ).
   */
  topK?: number;

  /** Setting for controlling repeated tokens/patterns (presence penalty, frequency penalty, etc.) */
  presencePenalty?: number;
  frequencyPenalty?: number;

  /**
   * Whether to enable streaming.
   * Note that each provider might require different code for streaming
   * (e.g. using `callbacks` or `streaming: true`).
   */
  streaming?: boolean;

  /**
   * The maximum number of tokens to generate in the completion.
   * Some providers might use `maxTokens`, others `max_length`, etc.
   */
  maxTokens?: number;

  /** Provide your own API key if not using environment variables. */
  apiKey?: string;

  /**
   * Additional catch-all for properties unique to a provider
   * that aren’t worth elevating to the top-level.
   */
  [key: string]: any;
}

// If you have any truly distinct settings that you’d like typed differently for each provider.
interface OpenAIOptions {
  openAIApiKey?: string;
  organization?: string; // in case you handle this for enterprise usage
  // ...
}

interface AnthropicOptions {
  anthropicApiKey?: string;
  // ...
}

interface DeepSeekOptions {
  deepSeekApiKey?: string;
  // ...
}

interface GoogleOptions {
  googleApiKey?: string;
  // ...
}

// You can unify them into a single type if needed or keep them separate if you want strongly typed provider configs.
type ProviderSpecificOptions =
  | OpenAIOptions
  | AnthropicOptions
  | DeepSeekOptions
  | GoogleOptions;

// A single "combined" type for all user parameters
export type LLMFactoryOptions = BaseLLMOptions & ProviderSpecificOptions;
