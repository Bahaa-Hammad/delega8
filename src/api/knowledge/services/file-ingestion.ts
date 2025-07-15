// file-ingestion.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { TableService } from './table';
import { RowService } from './row';
import { EmbeddingService } from './embedding';

import { ColumnType, SupportedFileFormats } from '../enums';

import * as fs from 'fs';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import { UserService } from '@user/user.service';
import { TableEntity } from '@knowledge/entities/table';
import * as Papa from 'papaparse';
import { CreateTableDTO } from '../types';
import { RowEntity } from '../entities/row';

import { ChromaClientInternal } from '@common/clients/chroma/chroma';
@Injectable()
export class FileIngestionService {
  private readonly logger = new Logger(FileIngestionService.name);

  constructor(
    private readonly tableService: TableService,
    private readonly rowService: RowService,
    private readonly embeddingService: EmbeddingService,
    private readonly userService: UserService,
    private readonly chromaClient: ChromaClientInternal,
  ) {}

  /**
   * 1) Create a new table for this CSV
   * 2) Parse CSV -> get headers -> create columns
   * 3) Insert each row, embed it
   */
  async addCsvRows(
    userId: string,
    table: Partial<TableEntity>,
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<Partial<TableEntity>> {
    // 1) Find the user in DB
    const user = await this.userService.findFullOne(userId);

    this.logger.log(`Importing CSV "${originalName}" as a new table`);

    // 3) Write file to temp
    const tmpPath = path.join('/tmp', `upload-${Date.now()}.csv`);
    fs.writeFileSync(tmpPath, fileBuffer);

    // 4) Parse CSV with Papa in Node.js mode
    //    Papa uses callback style, so we'll wrap in a Promise for convenience.
    const parseResult = await new Promise<Papa.ParseResult>(
      (resolve, reject) => {
        Papa.parse(fs.createReadStream(tmpPath), {
          header: true, // automatically treats first row as column headers
          skipEmptyLines: true,
          complete: (results) => resolve(results),
          error: (err) => reject(err),
        });
      },
    );

    if (parseResult.errors?.length) {
      this.logger.error(
        `Papa Parse errors: ${JSON.stringify(parseResult.errors)}`,
      );
      // handle or throw an exception
    }

    // 5) We now have `parseResult.data` as an array of objects: each key is a column name from the CSV header
    // Example: [{ "name": "John Doe", "age": "30", "email": "john@example.com" }, ...]

    if (!parseResult.data || !parseResult.data.length) {
      this.logger.warn(`CSV "${originalName}" appears to have no data.`);
      return table;
    }

    // 6) Create columns for each header in the first object
    //    (Papa Parse only has header row in the `meta.fields` if header=true)
    const headers = parseResult.meta.fields || [];
    for (const header of headers) {
      await this.tableService.addColumn(user.id, {
        tableId: table.id,
        columnName: header,
        columnType: ColumnType.TEXT, // or do type detection if you want
      });
    }

    const rowEntities = parseResult.data.map((rowObj) => {
      return this.buildRowEntity(table, rowObj);
      // (buildRowEntity is a new helper that doesn't save to DB, see below)
    });

    const savedRows = await this.rowService.saveRows(rowEntities);

    const rowIds = savedRows.map((r) => r.id);
    const texts = savedRows.map((r) => this.embeddingService.getRowText(r));
    const embeddings = await this.chromaClient.embedDocuments(texts);

    const docs = texts; // or transform if needed
    const ids = rowIds.map((id, i) => `${id}-bulkchunk-${i}`);
    const metas = rowIds.map((id) => ({
      userId,
      tableId: table.id,
      rowId: id,
    }));

    await this.chromaClient.upsertDocuments(
      'table_embeddings2',
      ids,
      docs,
      metas,
      embeddings,
    );

    this.logger.log(
      `Finished importing CSV -> Table: ${table.id}, total rows: ${parseResult.data.length}`,
    );

    return table;
  }
  public buildRowEntity(
    table: Partial<TableEntity>,
    data: Record<string, any>,
  ): Partial<RowEntity> {
    const rowEntity = this.rowService.createRowEntity(table, data);
    return rowEntity;
  }
  /**
   * 1) Create a new table for PDF
   * 2) Add one or two columns: "file_url" & "text"
   * 3) Insert a single row with PDF text
   * 4) Embed the row
   */
  async addPdfRows(
    userId: string,
    table: Partial<TableEntity>,
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<Partial<TableEntity>> {
    const user = await this.userService.findFullOne(userId);
    // 1) Create table

    // 2) Add columns
    await this.tableService.addColumn(user.id, {
      tableId: table.id,
      columnName: 'file_url',
      columnType: ColumnType.LINK,
    });
    await this.tableService.addColumn(user.id, {
      tableId: table.id,
      columnName: 'text',
      columnType: ColumnType.TEXT,
    });
    // 3) Extract PDF text

    const tmpPath = path.join('/tmp', `upload-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, fileBuffer);

    const dataBuffer = fs.readFileSync(tmpPath);
    const parsed = await pdfParse(dataBuffer);

    // 4) Create single row
    const newRow = await this.rowService.createRow(user.id, table.id, {
      file_name: originalName,
      file_url: 'your-file-storage-link-or-blank',
      text: parsed.text,
    });

    // 5) Embed
    await this.embeddingService.embedRow(user.id, table.id, newRow.id);

    this.logger.log(`PDF imported -> Table: ${table.id}`);
    return table;
  }

  async addJsonRows(
    userId: string,
    table: Partial<TableEntity>,
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<Partial<TableEntity>> {
    const user = await this.userService.findFullOne(userId);

    await this.tableService.addColumn(user.id, {
      tableId: table.id,
      columnName: 'file_url',
      columnType: ColumnType.LINK,
    });
    await this.tableService.addColumn(user.id, {
      tableId: table.id,
      columnName: 'text',
      columnType: ColumnType.TEXT,
    });

    const tmpPath = path.join('/tmp', `upload-${Date.now()}.json`);
    fs.writeFileSync(tmpPath, fileBuffer);

    const dataBuffer = fs.readFileSync(tmpPath);

    const newRow = await this.rowService.createRow(user.id, table.id, {
      file_name: originalName,
      file_url: 'your-file-storage-link-or-blank',
      text: dataBuffer.toString(),
    });

    await this.embeddingService.embedRow(user.id, table.id, newRow.id);

    return table;
  }

  async addFileRows(
    userId: string,
    table: Partial<TableEntity>,
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<Partial<TableEntity>> {
    const extension = path.extname(originalName).toLowerCase();
    const handlers = {
      [SupportedFileFormats.CSV]: () =>
        this.addCsvRows(userId, table, fileBuffer, originalName),
      [SupportedFileFormats.PDF]: () =>
        this.addPdfRows(userId, table, fileBuffer, originalName),
      [SupportedFileFormats.JSON]: () =>
        this.addJsonRows(userId, table, fileBuffer, originalName),
    };

    const handler = handlers[extension];
    if (!handler) {
      throw new Error(`Unsupported file format: ${extension}`);
    }

    return handler();
  }
}
