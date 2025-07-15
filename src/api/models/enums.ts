export enum ModelAvailability {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

// models/enums.ts

export enum ModelProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  AI21 = 'AI21',
  COHERE = 'COHERE',
  HUGGING_FACE = 'HUGGING_FACE', // e.g., Transformers API
  GCP_GENERATIVEAI = 'GCP_GENERATIVEAI', // PaLM 2 & related
  AZURE_OPENAI = 'AZURE_OPENAI', // Azure-based OpenAI service
  GPT4ALL = 'GPT4ALL', // Local/offline solutions from GPT4All
  // Add any others you need below
  META = 'META', // e.g., Llama 2
  CUSTOM_LOCAL = 'CUSTOM_LOCAL', // e.g., self-hosted or private
  GOOGLE = 'GOOGLE',
}

export enum ModelType {
  TEXT_GENERATION = 'TEXT_GENERATION',
  TEXT_TO_IMAGE = 'TEXT_TO_IMAGE',
  IMAGE_TO_TEXT = 'IMAGE_TO_TEXT',
  AUDIO_TO_TEXT = 'AUDIO_TO_TEXT',
  TEXT_TO_SPEECH = 'TEXT_TO_SPEECH',
  IMAGE_TO_IMAGE = 'IMAGE_TO_IMAGE',
  CODE_GENERATION = 'CODE_GENERATION',
  // Add more types as needed
}
