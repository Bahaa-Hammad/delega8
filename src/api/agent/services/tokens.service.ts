import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentEntity } from '@agents/entities/agent.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UserEntity } from '@user/entities/user.entity';
import { TokenEntity } from '@agents/entities/token.entity';

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(AgentEntity)
    private readonly agentRepository: Repository<AgentEntity>,
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
  ) {}

  async createApiToken(userId: string, agentId: string): Promise<TokenEntity> {
    const agent = await this.agentRepository.findOne({
      where: { id: agentId, user: { id: userId } },
    });

    if (!agent) {
      throw new NotFoundException(`AgentEntity with ID "${agentId}" not found`);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenEntity = new TokenEntity();
    tokenEntity.token = token;
    tokenEntity.agent = agent;
    tokenEntity.createdAt = new Date();
    tokenEntity.expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    agent.apiTokens = [...(agent.apiTokens || []), tokenEntity];

    await this.agentRepository.save(agent);
    return tokenEntity;
  }

async deleteApiToken(
  userId: string,
  agentId: string,
  tokenId: string,
): Promise<void> {
  const agent = await this.agentRepository.findOne({
    where: { id: agentId, user: { id: userId } },
  });

  if (!agent) {
    throw new NotFoundException(`AgentEntity with ID "${agentId}" not found`);
  }

  await this.tokenRepository.delete({ id: tokenId, agent: { id: agentId } });
}

  async getApiTokens(userId: string, agentId: string): Promise<TokenEntity[]> {
    const tokens = await this.tokenRepository.find({
      relations: ['agent', 'agent.user'],
      where: {
        agent: {
          id: agentId,
          user: { id: userId },
        },
      },
    });

    return tokens;
  }

  async validateApiToken(
    agentId: string,
    token: string,
  ): Promise<TokenEntity | null> {
    const tokenEntity = await this.tokenRepository.findOne({
      where: { token: token, agent: { id: agentId } },
      relations: ['agent', 'agent.user'],
    });

    if (!tokenEntity) {
      console.log('tokenEntity not found');
      return null;
    }

    if (tokenEntity.agent.id !== agentId) {
      console.log('tokenEntity.agent.id !== agentId');
      return null;
    }

    if (tokenEntity.expiredAt < new Date()) {
      console.log('tokenEntity.expiredAt < new Date()');
      return null;
    }

    return tokenEntity;
  }

  async getUserFromToken(
    token: TokenEntity,
  ): Promise<Partial<UserEntity> | null> {
    const agent = token.agent;

    return agent?.user || null;
  }
}
