import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { OAuthProvider } from '../enums';
import { OAuthIntegration } from './oauth-integration';
import { AdminGuard } from '@src/api/admin/admin.guard';
import { UseGuards } from '@nestjs/common';

@UseGuards(AdminGuard)
@Entity('oauth_clients')
export class OAuthClient {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({
    type: 'enum',
    enum: OAuthProvider,
  })
  provider: OAuthProvider;

  @Column()
  clientId: string;

  @Column()
  clientSecret: string;

  @Column()
  authUrl: string;

  @Column()
  tokenUrl: string;

  @Column()
  scopes: string;

  @Column({ default: false })
  isActive: boolean;

  @Column()
  callbackUrl: string;

  // link to integration
  @OneToMany(() => OAuthIntegration, (integration) => integration.client)
  integrations: OAuthIntegration[];
}
