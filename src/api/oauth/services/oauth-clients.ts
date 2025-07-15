import { Injectable } from '@nestjs/common';
import { OAuthClient } from '../entities/oauth-client';
import { OAuthProvider } from '../enums';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class OAuthClientService {
  constructor(
    @InjectRepository(OAuthClient)
    private readonly oauthClientRepository: Repository<OAuthClient>,
  ) {}

  async createOAuthClient(client: OAuthClient) {
    return this.oauthClientRepository.save(client);
  }

  async getOAuthClient(id: string) {
    return this.oauthClientRepository.findOne({ where: { id } });
  }

  async updateOAuthClient(id: string, client: OAuthClient) {
    return this.oauthClientRepository.update(id, client);
  }

  async deleteOAuthClient(id: string) {
    return this.oauthClientRepository.delete(id);
  }

  async getOAuthClientByProvider(provider: OAuthProvider) {
    return this.oauthClientRepository.findOne({ where: { provider } });
  }
}
