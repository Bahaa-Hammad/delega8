// controllers/oauth.controller.ts
import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { OAuthIntegrationService } from '../services/outh-integration';
import { OAuthClientService } from '../services/oauth-clients';
import { UserService } from '@user/user.service'; // Hypothetical user service
import { OAuthProvider } from '../enums';
import { RequestWithUser } from '../types';
import { AuthenticatedRequest } from '@src/api/auth/types';
@Controller('auth')
export class OAuthController {
  constructor(
    private readonly integrationService: OAuthIntegrationService,
    private readonly clientService: OAuthClientService,
    private readonly userService: UserService,
  ) {}

  /**
   * Step 1: Initiate OAuth flow (redirect to provider).
   * e.g. GET /auth/google => dynamic-oauth strategy loads google config
   */
  @Get(':slug')
  @UseGuards(AuthGuard('dynamic-oauth'))
  async authRedirect(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    req.oauthStateData = { userId };
  }

  /**
   * Step 2: Callback route (provider -> we exchange code for tokens).
   * e.g. GET /auth/google/callback
   */
  @Get(':slug/callback')
  @UseGuards(AuthGuard('dynamic-oauth'))
  async authCallback(
    @Param('slug') slug: string,
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    try {
      // `req.user` set by dynamic-oauth strategy
      // It's an object: { slug, accessToken, refreshToken, ... }
      const { accessToken, refreshToken, userIdFromState } = req.user;

      // TODO: Send the user id when you redirect and retrieve it here
      const userId = userIdFromState;
      const user = await this.userService.findFullOne(userId);

      // 2) Retrieve the client from DB
      const client = await this.clientService.getOAuthClientByProvider(
        slug as OAuthProvider,
      );

      // 3) Store tokens in oauth_integrations
      await this.integrationService.upsertIntegration(
        user,
        client,
        accessToken,
        refreshToken,
        req.user,
      );

      return res.status(HttpStatus.OK).json({ success: true });
    } catch (err) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message });
    }
  }
}
