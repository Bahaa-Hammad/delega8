import { Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { OAuthClientService } from '../services/oauth-clients';
import { OAuthClient } from '../entities/oauth-client';
import { Body } from '@nestjs/common';
import { AdminGuard } from '@src/api/admin/admin.guard';

@UseGuards(AdminGuard)
@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthClientService: OAuthClientService) {}

  @Post()
  async createOAuthClient(@Body() client: OAuthClient) {
    return this.oauthClientService.createOAuthClient(client);
  }

  @Get(':id')
  async getOAuthClient(@Param('id') id: string) {
    return this.oauthClientService.getOAuthClient(id);
  }

  @Put(':id')
  async updateOAuthClient(
    @Param('id') id: string,
    @Body() client: OAuthClient,
  ) {
    return this.oauthClientService.updateOAuthClient(id, client);
  }
}
