import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TokensService } from '../services/tokens.service';

@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(private readonly tokensService: TokensService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiToken = this.extractTokenFromHeader(request);

    if (!apiToken) {
      throw new UnauthorizedException('API token is missing');
    }

    // Check if the token exists in the agent's tokens
    const validToken = await this.tokensService.validateApiToken(
      request.params.agentId,
      apiToken,
    );
    if (!validToken) {
      throw new UnauthorizedException('Invalid API token');
    }

    request.token = validToken;
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const token = request.headers['x-api-key'];
    return token;
  }
}
