import { ChatsService } from '@agents/services/chats.service';
import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ChatBodySpec } from '@agents/types';
import { ApiTokenRequest, AuthenticatedRequest } from '@auth/types';
import { Body } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';
import { ApiTokenGuard } from '@agents/guards/api-token-guard';
import { TokensService } from '@agents/services/tokens.service';

@Controller('agents/:agentId/chats')
export class ChatController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly tokensService: TokensService,
  ) {}

  // I want to be able for non-authenticated users to chat with the agent using an API KEY

  @UseGuards(JwtAuthGuard)
  @Post()
  chatWithAgent(
    @Param('agentId') agentId: string,
    @Body() data: ChatBodySpec,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.chatsService.chatWithAgent(agentId, data, user.id);
  }

  @UseGuards(ApiTokenGuard)
  @Post('with-token')
  async chatWithAgentViaToken(
    @Param('agentId') agentId: string,
    @Body() data: ChatBodySpec,
    @Req() req: ApiTokenRequest,
  ) {
    const token = req.token;

    const user = await this.tokensService.getUserFromToken(token);

    return this.chatsService.chatWithAgent(agentId, data, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getChats(
    @Param('agentId') agentId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.chatsService.getChats(user.id, agentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':chatId')
  getChat(
    @Param('agentId') agentId: string,
    @Param('chatId') chatId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.chatsService.getChat(user.id, agentId, chatId);
  }
}
