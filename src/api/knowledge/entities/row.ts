import {
  Entity,
  PrimaryGeneratedColumn,
  Column as OrmColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TableEntity } from './table';

@Entity('table_rows')
export class RowEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => TableEntity, (table) => table.rows, {
    onDelete: 'CASCADE',
  })
  table: TableEntity;

  // Key-value pairs for each column
  @OrmColumn({ type: 'jsonb', default: {} })
  data: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
