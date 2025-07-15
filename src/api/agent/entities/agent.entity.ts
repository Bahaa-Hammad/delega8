import { ToolEntity } from 'src/api/tool/entities/tool.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { ChatEntity } from './chats.entity';
import { LlmModel } from '@core/steps/steps/llm/types';
import { UserEntity } from '@user/entities/user.entity';
import { AgentStatus } from '@agents/types';
import { AgentType } from '@agents/types';
import { TokenEntity } from './token.entity';
@Entity()
export class AgentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  coreInstructions?: string;

  @Column({ nullable: true })
  category?: string;

  @Column('text', { array: true, nullable: true })
  tags?: string[];

  /**
   * Parents: All agents that point to this agent as a child.
   * Children: All agents this agent points to as parents.
   *
   * We use one join table for the parent-child relationship.
   * "parentIds" => This agent's parents
   * "childIds"  => This agent's children
   */
  @ManyToMany(() => AgentEntity, (agent) => agent.children, { cascade: true })
  @JoinTable({
    name: 'agent_relationships',
    joinColumn: { name: 'parentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'childId', referencedColumnName: 'id' },
  })
  parents: AgentEntity[];

  @ManyToMany(() => AgentEntity, (agent) => agent.parents)
  children: AgentEntity[];

  @ManyToMany(() => ToolEntity, (tool) => tool.agents, { cascade: true })
  @JoinTable({
    name: 'agent_tools',
    joinColumn: { name: 'agentId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'toolId', referencedColumnName: 'id' },
  })
  tools: ToolEntity[];

  // TODO: remove conditional ?
  @OneToMany(() => ChatEntity, (chat) => chat.agent)
  chats: ChatEntity[];

  @ManyToOne(() => UserEntity, (user) => user.agents)
  user?: UserEntity;

  // Model column, LLM model name
  @Column({ type: 'jsonb', nullable: true })
  model: LlmModel;

  @Column({
    type: 'enum',
    enum: AgentType,
    default: AgentType.USER,
  })
  type: AgentType;

  @Column({
    type: 'enum',
    enum: AgentStatus,
    default: AgentStatus.DRAFT,
  })
  status: AgentStatus;

  @OneToMany(() => TokenEntity, (token) => token.agent, { cascade: true })
  apiTokens: TokenEntity[];
}
