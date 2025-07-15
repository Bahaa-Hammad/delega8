import { IsString } from 'class-validator';
import { UserRole } from 'src/enums';
import { TokenEntity } from '@agents/entities/token.entity';
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

export class LoginDto {
  @IsString()
  email: string;

  @IsString()
  password: string;
}

export interface TokensPayload {
  accessToken: string;
  refreshToken: string;
}

export interface DecodedToken {
  id: string;
  email: string;
  role: UserRole;
}

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: DecodedToken;
  oauthStateData?: {
    userId: string;
  };
}

export interface ApiTokenRequest extends Request {
  token?: TokenEntity;
}
