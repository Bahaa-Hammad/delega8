import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { UserEntity } from '@user/entities/user.entity';
import { OAuthProvider } from '../enums';
import { OAuthClient } from './oauth-client';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@src/api/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Entity('oauth_integrations')
export class OAuthIntegration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: OAuthProvider,
  })
  provider: OAuthProvider;

  @Column()
  accessToken: string;

  @Column()
  refreshToken: string;

  @Column()
  expiresAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.integrations, {
    onDelete: 'CASCADE',
  })
  user: UserEntity;

  @ManyToOne(() => OAuthClient, (client) => client.integrations)
  client: OAuthClient;

  // Metadata jsonb
  @Column({ type: 'jsonb' })
  metadata: Record<string, any>; // save other information and user details here
}
