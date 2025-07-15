import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Exclude } from 'class-transformer';
import { UserRole } from '@src/enums';
import { AgentEntity } from '@agents/entities/agent.entity';
import { ToolEntity } from '@tools/entities/tool.entity';
import { TableEntity } from '@knowledge/entities/table';
import { OAuthIntegration } from '@src/api/oauth/entities/oauth-integration';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Exclude()
  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  async setPassword(password: string): Promise<void> {
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(password, salt);
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  @OneToMany(() => AgentEntity, (agent) => agent.user)
  agents: AgentEntity[];

  @OneToMany(() => ToolEntity, (tool) => tool.user)
  tools: ToolEntity[];

  @OneToMany(() => TableEntity, (table) => table.owner)
  tables: TableEntity[];

  @OneToMany(() => OAuthIntegration, (integration) => integration.user)
  integrations: OAuthIntegration[];
}
