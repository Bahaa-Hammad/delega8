import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from 'src/enums';

@Injectable()
export class AdminService {
  private readonly adminPasswordHash: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.adminPasswordHash =
      this.configService.get<string>('adminPasswordHash');
  }

  async login(password: string) {
    const isValid = await bcrypt.compare(password, this.adminPasswordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid password');
    }
    return { token: this.jwtService.sign({ role: UserRole.ADMIN }) };
  }
}
