import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { MyChatMessage } from '../types';
import { AgentEntity } from './agent.entity';
import { StateType } from '../types';
@Entity('chats')
export class ChatEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb', default: {} })
  state: StateType;

  @Column({ type: 'jsonb', default: [] })
  messages: MyChatMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => AgentEntity, (agent) => agent.chats, { nullable: false })
  agent: AgentEntity;
}
