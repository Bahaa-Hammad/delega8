import {
  Entity,
  PrimaryGeneratedColumn,
  Column as OrmColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TableEntity } from './table';
import { ColumnType } from '../enums';

@Entity('table_columns')
export class ColumnEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TableEntity, (table) => table.columns, {
    onDelete: 'CASCADE',
  })
  table: TableEntity;

  @OrmColumn()
  name: string; // e.g. "filename", "text", "source_url"

  @OrmColumn({
    type: 'enum',
    enum: ColumnType,
  })
  type: ColumnType; // text, number, etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
