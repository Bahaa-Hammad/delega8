import {
  Entity,
  PrimaryGeneratedColumn,
  Column as OrmColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '@user/entities/user.entity';
import { ColumnEntity } from './column';
import { RowEntity } from './row';

@Entity('tables')
export class TableEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OrmColumn()
  name: string; // e.g. "User's CSV", "User's PDF", "Manual Table"

  @ManyToOne(() => UserEntity, (user) => user.tables, { eager: true })
  owner: UserEntity;

  @OneToMany(() => ColumnEntity, (col) => col.table, {
    cascade: true,
    eager: true,
  })
  columns: ColumnEntity[];

  @OneToMany(() => RowEntity, (row) => row.table, {
    cascade: true,
  })
  rows: RowEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
