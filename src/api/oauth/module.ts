import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthClient } from './entities/oauth-client';
import { OAuthClientService } from './services/oauth-clients';
import { OAuthController } from './controllers/oauth-clients';
import { UserModule } from '../user/user.module';
import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { OAuthIntegration } from './entities/oauth-integration';
@Module({
  imports: [
    TypeOrmModule.forFeature([OAuthClient, OAuthIntegration]),
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    forwardRef(() => AdminModule),
  ],
  providers: [OAuthClientService, OAuthClient, OAuthIntegration],
  controllers: [OAuthController],
  exports: [OAuthClientService, OAuthClient, OAuthIntegration],
})
export class OAuthModule {}
