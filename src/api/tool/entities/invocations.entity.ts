import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { ToolEntity } from './tool.entity';
import { ToolInvocationStatus } from '../types';

@Entity()
export class ToolInvocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ToolEntity, (tool) => tool.invocations, {
    onDelete: 'CASCADE',
  })
  tool: ToolEntity;

  @Column({ type: 'jsonb' })
  input: any;

  @Column({ type: 'jsonb' })
  output: any;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'enum', enum: ToolInvocationStatus })
  status: ToolInvocationStatus;

  @Column({ type: 'text', nullable: true })
  error?: string;
}
