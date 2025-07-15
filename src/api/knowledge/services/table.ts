// table.service.ts
import {
  Inject,
  forwardRef,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableEntity } from '../entities/table';
import { ColumnEntity } from '../entities/column';
import { CreateTableDTO, CreateColumnDTO } from '../types';
import { UserEntity } from '@user/entities/user.entity';
import { RowService } from './row';
import { EmbeddingService } from './embedding';
import { Logger } from '@nestjs/common';

@Injectable()
export class TableService {
  private readonly logger = new Logger(TableService.name);

  constructor(
    @InjectRepository(TableEntity)
    private readonly tableRepo: Repository<TableEntity>,
    @InjectRepository(ColumnEntity)
    private readonly columnRepo: Repository<ColumnEntity>,

    @Inject(forwardRef(() => RowService))
    private readonly rowService: RowService,

    private readonly embeddingService: EmbeddingService,
  ) {}

  async createTable(
    user: UserEntity,
    dto: CreateTableDTO,
  ): Promise<TableEntity> {
    const table = this.tableRepo.create({
      name: dto.name,
      owner: user,
      columns: [],
      rows: [],
    });
    return this.tableRepo.save(table);
  }

  async listTables(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ tables: TableEntity[]; total: number }> {
    const [tables, total] = await this.tableRepo.findAndCount({
      where: { owner: { id: userId } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      tables,
      total,
    };
  }

  async findByIdOrFail(
    userId: string,
    tableId: string,
  ): Promise<Partial<TableEntity>> {
    const table = await this.tableRepo.findOne({
      where: { id: tableId, owner: { id: userId } },
      relations: ['columns', 'rows'],
    });

    if (!table) {
      throw new NotFoundException(`Table ${tableId} not found.`);
    }

    const { owner, ...rest } = table;
    return rest;
  }

  async addColumn(userId: string, dto: CreateColumnDTO): Promise<ColumnEntity> {
    const table = await this.tableRepo.findOne({
      where: { id: dto.tableId, owner: { id: userId } },
    });
    if (!table) {
      throw new NotFoundException(`Table ${dto.tableId} not found.`);
    }
    const column = this.columnRepo.create({
      table,
      name: dto.columnName,
      type: dto.columnType,
    });
    return this.columnRepo.save(column);
  }

  public async removeColumnAndReEmbed(
    userId: string,
    tableId: string,
    columnId: string,
  ): Promise<void> {
    // 1) Ensure the table belongs to this user
    const table = await this.tableRepo.findOne({
      where: { id: tableId, owner: { id: userId } },
      relations: ['columns'],
    });
    if (!table) {
      throw new NotFoundException(
        `Table ${tableId} not found for user ${userId}.`,
      );
    }

    // 2) Find the column
    const column = table.columns.find((col) => col.id === columnId);
    if (!column) {
      throw new NotFoundException(
        `Column ${columnId} not found in table ${tableId}.`,
      );
    }

    const columnName = column.name; // We'll need the name to remove from row.data

    // 3) Remove the column entity
    await this.columnRepo.remove(column);
    this.logger.log(
      `Removed column ${columnId} ("${columnName}") from table ${tableId}.`,
    );

    // 4) Fetch all rows in this table
    const rows = await this.rowService.listRowsForTable(userId, tableId);
    if (!rows.length) {
      this.logger.log(
        `No rows to update in table ${tableId}. Column removal complete.`,
      );
      return;
    }

    // 5) For each row, remove the column's data, then re-embed
    for (const row of rows) {
      if (columnName in row.data) {
        // Remove the column from row.data
        delete row.data[columnName];
        // Save the updated row
        const updated = await this.rowService.updateRow(userId, {
          tableId,
          rowId: row.id,
          data: row.data,
        });
      }
    }

    this.logger.log(
      `Removed column "${columnName}" from ${rows.length} row(s), re-embedded each row.`,
    );
  }
}
