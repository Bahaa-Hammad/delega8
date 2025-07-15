// services/oauth-integration.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@user/entities/user.entity';
import { OAuthIntegration } from '../entities/oauth-integration';
import { OAuthClient } from '../entities/oauth-client';
@Injectable()
export class OAuthIntegrationService {
  constructor(
    @InjectRepository(OAuthIntegration)
    private readonly integrationRepo: Repository<OAuthIntegration>,
  ) {}

  async upsertIntegration(
    user: UserEntity,
    client: OAuthClient,
    accessToken: string,
    refreshToken: string,
    metadata: Record<string, any>,
  ): Promise<OAuthIntegration> {
    const existing = await this.integrationRepo.findOne({
      where: { user: { id: user.id }, client: { id: client.id } },
    });

    if (existing) {
      existing.accessToken = accessToken;
      existing.refreshToken = refreshToken;
      existing.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // example 1 hour
      return this.integrationRepo.save(existing);
    }

    const integration = this.integrationRepo.create({
      user,
      client,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    return this.integrationRepo.save(integration);
  }
}
