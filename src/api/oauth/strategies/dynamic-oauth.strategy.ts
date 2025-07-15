// strategies/dynamic-oauth.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { Request } from 'express';
import { OAuthClientService } from '../services/oauth-clients';
import { AuthenticatedRequest } from '@src/api/auth/types';

// We name this strategy "dynamic-oauth" (could be "generic-oauth")
@Injectable()
export class DynamicOAuthStrategy extends PassportStrategy(
  Strategy,
  'dynamic-oauth',
) {
  constructor(private readonly clientService: OAuthClientService) {
    // We pass "dummy" values here; we'll override them in "authenticate()"
    super({
      authorizationURL: '',
      tokenURL: '',
      clientID: '',
      clientSecret: '',
      callbackURL: '',
      passReqToCallback: true,
      scope: [],
    });
  }

  /**
   * Overriding the default authenticate() method of passport-oauth2
   * to dynamically set the client config from DB before calling super().
   */
  async authenticate(req: AuthenticatedRequest, options?: any): Promise<void> {
    // Example route: /auth/:slug
    // e.g. /auth/google, /auth/confluence
    const { slug } = req.params;
    if (!slug) {
      return super.fail(new Error('Missing OAuth client slug'), 400);
    }

    // 1) Fetch the client config from DB
    const client = await this.clientService.getOAuthClient(slug);
    if (!client || !client.isActive) {
      return super.fail(new Error('OAuth client not found or inactive'), 404);
    }

    if (req.oauthStateData?.userId) {
      // The "state" is just a string. You can store multiple data
      // by JSON-encoding or referencing a short token.
      options.state = JSON.stringify({
        userId: req.oauthStateData.userId,
      });
    }

    // 2) Override OAuth2Strategy internals
    (this as any)._oauth2._clientId = client.clientId;
    (this as any)._oauth2._clientSecret = client.clientSecret;
    (this as any)._oauth2._authorizeUrl = client.authUrl;
    (this as any)._oauth2._accessTokenUrl = client.tokenUrl;
    (this as any)._callbackURL = client.callbackUrl;

    // If you want to specify different scopes per client, do so here:
    options.scope = client.scopes.split(' ');

    // The callbackURL used by passport-oauth2
    // We'll rely on what's in DB or fallback to dynamic approach

    // 3) Now call the parent authenticate, which does the redirect or token exchange
    return super.authenticate(req, options);
  }

  /**
   * "validate" is called AFTER the OAuth provider responds with tokens.
   * We have access to accessToken, refreshToken, etc.
   * We can attach them to req.user or handle them immediately.
   */
  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ) {
    // 'profile' is only available if we call a user profile endpoint,
    // but passport-oauth2 doesn't do that automatically.
    // Typically you'd do that in "userProfile()" override if you want it.

    // For now, we just pass tokens through

    let userIdFromState: string | null = null;
    try {
      if (req.query.state) {
        const stateObj = JSON.parse(req.query.state as string);
        userIdFromState = stateObj.userId;
      }
    } catch (e) {
      // handle parse error
    }
    const userObj = {
      slug: req.params.slug,
      accessToken,
      refreshToken,
      // no profile by default in passport-oauth2
      userIdFromState,
    };

    // Save the metadata in the integration
    return done(null, userObj);
  }
}
