import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ChromaClient, OpenAIEmbeddingFunction, Collection } from 'chromadb';
// (Optionally inject a
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { ChromaInferenceEmbeddings } from './chromaInferenceEmbeddings';

@Injectable()
export class ChromaClientInternal implements OnModuleInit {
  private chromaClient: ChromaClient;
  private embedder: OpenAIEmbeddings | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // Initialize ChromaClient with the server URL from config

    const chromaUrl =
      this.configService.get<string>('CHROMA_URL') || 'http://localhost:8000';
    this.chromaClient = new ChromaClient({ path: chromaUrl });

    // (Optional) Initialize a default embedding function (e.g., OpenAI)

    const openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiApiKey) {
      // Use 'model_name'
      this.embedder = new OpenAIEmbeddings({
        openAIApiKey: openaiApiKey,
        modelName: 'text-embedding-ada-002',
      });
    }
    await this.getOrCreateCollection('table_embeddings2');
    const collections = await this.chromaClient.listCollections();
  }

  /** Ensure a collection exists and return it. Uses default embedder if available. */
  private async getOrCreateCollection(name: string, embedder?: any) {
    try {
      return await this.chromaClient.getOrCreateCollection({
        name,
        embeddingFunction: embedder,
      });
    } catch (err) {
      // Option 1: re-throw with more context
      throw new Error(`Failed to getOrCreateCollection '${name}': ${err}`);

      // Option 2 (rarely):
      // attempt a fallback creation if there's a known error reason
      // but usually getOrCreateCollection is already robust in the chroma client
    }
  }

  /** Upsert documents (with embeddings or raw text) into a Chroma collection. */
  async upsertDocuments(
    collectionName: string,
    ids: string[],
    documents: string[] = [],
    metadatas: object[] = [],
    embeddings: number[][] = [],
  ): Promise<void> {
    const collection = await this.getOrCreateCollection(collectionName);
    // If no embeddings provided but we have documents and an embedding function, use that
    const useEmbeddings = embeddings && embeddings.length > 0;
    if (!useEmbeddings && documents.length > 0) {
      // Ensure the collection has an embedding function
      if (!collection) {
        throw new Error(
          `Collection ${collectionName} not found and no embedder available for text embedding.`,
        );
      }
      // (If collection was just created with defaultEmbedder, it will use it automatically)
    }
    // Perform upsert (add new or update existing vectors)

    await collection.upsert({
      ids,
      documents: documents.length ? documents : undefined,
      embeddings: useEmbeddings ? embeddings : undefined,
      metadatas: metadatas.length
        ? metadatas.map((m) => ({ ...m }))
        : undefined,
    });
  }

  /** Query a collection by vector or text and optional metadata filter. */
  async queryCollection(
    collectionName: string,
    query: string | number[],
    nResults: number = 5,
    whereFilter: object = {},
  ): Promise<any> {
    // 1) Get/create the collection (no server-side embed function)
    const collection = await this.chromaClient.getOrCreateCollection({
      name: collectionName,
    });
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }

    // 2) Build query params
    const queryParams: any = { nResults };

    // 3) If query is a string, embed it locally; if it's already a vector, use as-is
    let queryEmbedding: number[];
    if (typeof query === 'string') {
      queryEmbedding = await this.embedder.embedQuery(query);
    } else {
      // We assume the user is passing a numeric vector
      queryEmbedding = query as number[];
    }
    // Pass an array of embeddings if you want to query multiple at once,
    // but for a single query, we wrap it in [ ... ].
    queryParams.queryEmbeddings = [queryEmbedding];

    // 4) If user wants a metadata filter, add it
    if (whereFilter && Object.keys(whereFilter).length > 0) {
      queryParams.where = whereFilter;
    }

    // 5) Execute the similarity search
    const results = await collection.query(queryParams);
    return results; // contains ids, distances, metadatas, documents, etc.
  }

  /** Delete documents from a collection by ids or metadata filter. */
  async deleteDocuments(
    collectionName: string,
    ids: string[] = [],
    whereFilter: object = {},
  ): Promise<void> {
    const collection = await this.chromaClient.getOrCreateCollection({
      name: collectionName,
    });
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }
    const deleteParams: any = {};
    if (ids.length > 0) {
      deleteParams.ids = ids;
    }
    if (whereFilter && Object.keys(whereFilter).length > 0) {
      deleteParams.where = whereFilter;
    }
    if (!deleteParams.ids && !deleteParams.where) {
      throw new Error(
        'Must provide ids or a where filter to delete documents.',
      );
    }
    console.log('deleteParams', deleteParams);
    await collection.delete(deleteParams);
  }

  async embedDocuments(documents: string[]) {
    const embeddings = await this.embedder.embedDocuments(documents);
    return embeddings;
  }

  async getDocuments(collectionName: string) {
    const collection = await this.chromaClient.getOrCreateCollection({
      name: collectionName,
    });
    const documents = await collection.get();
    return documents;
  }
}
