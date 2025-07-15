import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { UserRole } from 'src/enums';
import { ConfigService } from '@nestjs/config';
import { TokenType } from './enums';
import { UserEntity } from 'src/api/user/entities/user.entity';
import { TokensPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<Partial<UserEntity>> {
    const user = await this.userService
      .findAll()
      .then((users) => users.find((user) => user.email === email));

    if (user && (await user.validatePassword(password))) {
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  async login(user: Partial<UserEntity>): Promise<TokensPayload> {
    const payload = {
      email: user.email,
      name: user.name,
      sub: user.id,
      role: UserRole.USER,
    };

    const accessToken = this.jwtService.sign(
      { ...payload, type: TokenType.ACCESS_TOKEN },
      {
        expiresIn: this.configService.get<string>('jwtAccessTokenExpiresIn'),
      },
    );

    const refreshToken = this.jwtService.sign(
      { ...payload, type: TokenType.REFRESH_TOKEN },
      {
        expiresIn: this.configService.get<string>('jwtRefreshExpiresIn'),
      },
    );

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwtSecret'),
      });

      if (payload.type !== TokenType.REFRESH_TOKEN) {
        throw new UnauthorizedException('Invalid token type');
      }

      const newAccessToken = this.jwtService.sign(
        {
          email: payload.email,
          name: payload.name,
          sub: payload.sub,
          role: payload.role,
          type: TokenType.ACCESS_TOKEN,
        },
        {
          expiresIn: this.configService.get<string>(
            'jwtAccessTokenExpiresIn',
            '1h',
          ),
        },
      );

      return { accessToken: newAccessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
