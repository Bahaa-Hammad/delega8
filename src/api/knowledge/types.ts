import { IsOptional } from 'class-validator';
import { IsNumber } from 'class-validator';
import { ColumnType } from './enums';

export interface CreateTableDTO {
  name: string;
}

export interface CreateColumnDTO {
  tableId: string;
  columnName: string;
  columnType: ColumnType;
}

export interface UpdateRowDTO {
  tableId: string;
  rowId: string;
  data: Record<string, any>;
}

export interface UploadFileDTO {
  tableId: string;
  file: Express.Multer.File;
  fileType: string;
  originalName: string;
}

export class PaginationQueryDTO {
  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export interface EnrichTableDTO {
  toolId: string;
  mapper: Record<string, string>;
  outputFields: string[];
}
