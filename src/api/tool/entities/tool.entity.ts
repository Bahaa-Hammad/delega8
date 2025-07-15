import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
  ManyToOne,
} from 'typeorm';

import { FieldSpec } from 'src/core/types';
import { ToolInvocationEntity } from './invocations.entity';
import { StepSpec } from '@core/steps/types';
import { AgentEntity } from '@agents/entities/agent.entity';
import { UserEntity } from '@user/entities/user.entity';
import { ToolPublishStatus, ToolType } from '@tools/types';
@Entity()
export class ToolEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  publishedBy?: string;

  // Add original id column, uuid
  @Column({ type: 'uuid', nullable: true })
  originalId?: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  fields: FieldSpec[];
  /**
   * We store "steps" in a JSONB column in PostgreSQL.
   * This can hold an array of instructions, objects, or any structured data.
   */
  @Column({ type: 'jsonb', nullable: true })
  steps: StepSpec[];

  /**
   * Many-to-many relation with Agents
   */
  @ManyToMany(() => AgentEntity, (agent) => agent.tools)
  agents: AgentEntity[];

  @ManyToOne(() => UserEntity, (user) => user.tools, { nullable: true })
  user?: UserEntity;

  @OneToMany(() => ToolInvocationEntity, (invocation) => invocation.tool)
  invocations: ToolInvocationEntity[];

  @Column({
    type: 'enum',
    enum: ToolType,
    default: ToolType.USER,
  })
  type: ToolType;

  @Column({
    type: 'enum',
    enum: ToolPublishStatus,
    default: ToolPublishStatus.DRAFT,
  })
  publishStatus: ToolPublishStatus;

  // TODO: Add output fields
}
