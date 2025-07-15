// embedding.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { RowEntity } from '../entities/row'; // Adjust path if needed

import { ChromaClientInternal } from '@common/clients/chroma/chroma';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    @InjectRepository(RowEntity)
    private readonly rowRepo: Repository<RowEntity>,
    private readonly chromaClient: ChromaClientInternal,
  ) {}

  /**
   * 1) Fetch row data
   * 2) Split text into chunks
   * 3) (Optionally) embed each chunk with an Embedding model
   * 4) Upsert to Chroma
   */
  async embedRow(
    userId: string,
    tableId: string,
    rowId: string,
  ): Promise<void> {
    // 1) Grab the row from DB
    const row = await this.rowRepo.findOne({ where: { id: rowId } });
    if (!row) {
      this.logger.warn(`embedRow: Row ${rowId} not found.`);
      return;
    }

    // 2) Convert row data to text

    const textToEmbed = this.getRowText(row);
    if (!textToEmbed) {
      this.logger.log(`No text to embed for row ${rowId}. Skipping.`);
      return;
    }

    // 3) Split large text
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitText(textToEmbed);
    // (Optional) If you want custom embeddings, you can do it here:
    // const embeddings = await this.chromaClient.embedDocuments(chunks);
    // But if the ChromaClient’s collection has a default embedder,
    // you can simply pass the texts directly in upsertDocuments.

    // 4) Build "records" for upserting
    const records = chunks.map((chunk, idx) => ({
      id: `${rowId}-chunk-${idx}`,
      document: chunk,
      metadata: {
        userId,
        tableId,
        rowId,
        chunk,
      },
    }));

    // Separate them into arrays, because our Chroma upsertDocuments
    // method expects separate params (ids, documents, metadatas, etc.)
    const ids = records.map((rec) => rec.id);
    const docs = records.map((rec) => rec.document);
    const metas = records.map((rec) => rec.metadata);

    // Use a single collection name, or build one dynamically:
    const collectionName = 'table_embeddings2';

    const embeddings = await this.chromaClient.embedDocuments(docs);
    // 5) Upsert into Chroma
    try {
      await this.chromaClient.upsertDocuments(
        collectionName,
        ids,
        docs,
        metas,
        embeddings,
      );
    } catch (error) {
      this.logger.error(`Error upserting records for row ${rowId}: ${error}`);
      throw error;
    }

    this.logger.log(
      `Row ${rowId} embedded into ${records.length} chunk(s) & upserted to Chroma.`,
    );
  }

  /**
   * Remove all embeddings for this row from Chroma using metadata filters.
   */
  async removeRowEmbedding(userId: string, tableId: string, rowId: string) {
    const filter = {
      rowId,
    };

    // Must pass the same collection name used above
    const collectionName = 'table_embeddings2';

    try {
      // deleteDocuments can take an array of IDs or a `where` filter
      // In this case, we pass an empty array of IDs but provide a filter

      const documents = await this.chromaClient.getDocuments(collectionName);

      await this.chromaClient.deleteDocuments(collectionName, [], filter);
      this.logger.log(
        `Removed all embeddings for row=${rowId}, table=${tableId}.`,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting embeddings for row=${rowId}, table=${tableId}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Helper to combine or retrieve row text
   */
  public getRowText(row: RowEntity): string {
    // If your row is for a PDF, you might store text in row.data["text"]
    if (row.data.text) {
      return row.data.text;
    }
    // Otherwise combine all textual columns from row.data
    return Object.values(row.data).join(' ');
  }
}
