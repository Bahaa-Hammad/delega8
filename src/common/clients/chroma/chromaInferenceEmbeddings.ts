// chromaInferenceEmbeddings.ts

import { OpenAIEmbeddings } from '@langchain/openai';

export class ChromaInferenceEmbeddings {
  private embeddings: OpenAIEmbeddings;

  constructor(openAIApiKey: string, modelName = 'text-embedding-ada-002') {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey,
      modelName,
    });
  }

  /**
   * Embed multiple documents at once (batch).
   */
  public async generate(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    return this.embeddings.embedDocuments(texts);
  }

  /**
   * Embed a single query.
   */
  public async embedQuery(text: string): Promise<number[]> {
    return this.embeddings.embedQuery(text);
  }
}
