// row.service.ts
import {
  Inject,
  forwardRef,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RowEntity } from '../entities/row';
import { TableService } from './table';
import { UpdateRowDTO } from '../types';
import { EmbeddingService } from './embedding';
import { TableEntity } from '../entities/table';

@Injectable()
export class RowService {
  constructor(
    @InjectRepository(RowEntity)
    private readonly rowRepo: Repository<RowEntity>,

    @Inject(forwardRef(() => TableService))
    private readonly tableService: TableService,

    private readonly embeddingService: EmbeddingService, // We'll create this
  ) {}

  async listRowsForTable(
    userId: string,
    tableId: string,
  ): Promise<RowEntity[]> {
    const table = await this.tableService.findByIdOrFail(
      userId as any,
      tableId,
    );
    return this.rowRepo.find({
      where: { table: { id: table.id } },
      order: { createdAt: 'DESC' },
    });
  }

  async createRow(
    userId: string,
    tableId: string,
    data: Record<string, any>,
  ): Promise<RowEntity> {
    const table = await this.tableService.findByIdOrFail(userId, tableId);

    const row = this.rowRepo.create({
      table,
      data,
    });

    const savedRow = await this.rowRepo.save(row);
    // Trigger embedding
    await this.embeddingService.embedRow(userId, table.id, savedRow.id);

    return savedRow;
  }

  createRowEntity(
    table: Partial<TableEntity>,
    data: Record<string, any>,
  ): Partial<RowEntity> {
    return this.rowRepo.create({ table, data });
  }

  async saveRows(rows: Partial<RowEntity>[]): Promise<RowEntity[]> {
    return this.rowRepo.save(rows, { chunk: 1000 });
  }

  async updateRow(userId: string, dto: UpdateRowDTO): Promise<RowEntity> {
    const table = await this.tableService.findByIdOrFail(
      userId as any,
      dto.tableId,
    );

    const row = await this.rowRepo.findOne({
      where: { id: dto.rowId, table: { id: table.id } },
    });
    if (!row) {
      throw new NotFoundException(
        `Row ${dto.rowId} not found in table ${dto.tableId}.`,
      );
    }

    row.data = { ...row.data, ...dto.data };
    const saved = await this.rowRepo.save(row);

    // 2) Remove old embeddings
    await this.embeddingService.removeRowEmbedding(userId, table.id, row.id);

    // 3) Embed updated text
    await this.embeddingService.embedRow(userId, table.id, row.id);

    return saved;
  }

  async deleteRow(
    userId: string,
    tableId: string,
    rowId: string,
  ): Promise<void> {
    const table = await this.tableService.findByIdOrFail(
      userId as any,
      tableId,
    );
    const row = await this.rowRepo.findOne({
      where: { id: rowId, table: { id: table.id } },
    });
    if (!row) {
      throw new NotFoundException(`Row ${rowId} not found.`);
    }

    await this.rowRepo.remove(row);
    // Also remove from Pinecone
    await this.embeddingService.removeRowEmbedding(userId, table.id, rowId);
  }
}
