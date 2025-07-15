import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from '../config/database.config';
import appConfig from '../config/app.config';
import { AuthModule } from './api/auth/auth.module';
import { AdminModule } from './api/admin/admin.module';
import { AgentModule } from './api/agent/agent.module';
import { ToolModule } from './api/tool/tool.module';
import { KnowledgeModule } from './api/knowledge/module';
import { ModelsModule } from './api/models/models.module';
import { OAuthModule } from './api/oauth/module';
import { StepsModule } from './api/steps/module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        const configs = {
          type: dbConfig.type,
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.name,
          autoLoadEntities: true,
          synchronize: true, // Disable in production
        };
        if (process.env.ENVIRONMENT == 'dev') return configs;
        return {
          ...configs,
          pool_mode: 'transaction',
        };
      },
    }),
    AuthModule,
    AdminModule,
    AgentModule,
    ToolModule,
    KnowledgeModule,
    ModelsModule,
    OAuthModule,
    StepsModule,
  ],
})
export class AppModule {}
