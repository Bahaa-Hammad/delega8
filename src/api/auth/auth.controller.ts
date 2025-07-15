import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, TokensPayload } from './types';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() data: LoginDto): Promise<TokensPayload> {
    const validatedUser = await this.authService.validateUser(
      data.email,
      data.password,
    );

    return this.authService.login(validatedUser);
  }

  @Post('refresh-token')
  async refreshToken(@Body() data: { refreshToken: string }) {
    return this.authService.refreshToken(data.refreshToken);
  }
}
