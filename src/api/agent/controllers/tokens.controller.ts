import { TokensService } from '@agents/services/tokens.service';
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest } from '@auth/types';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';

@Controller('agents/:id/tokens')
@UseGuards(JwtAuthGuard)
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Post()
  async createToken(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    const token = await this.tokensService.createApiToken(user.id, id);

    return {
      id: token.id,
      token: token.token,
      expiredAt: token.expiredAt,
      agentId: token.agent?.id,
    };
  }

  @Get()
  getTokens(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const user = req.user;
    return this.tokensService.getApiTokens(user.id, id);
  }

  @Delete(':tokenId')
  deleteToken(
    @Param('id') id: string,
    @Param('tokenId') tokenId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    return this.tokensService.deleteApiToken(user.id, id, tokenId);
  }
}
