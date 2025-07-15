import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentService } from './services/agent.service';
import { AgentController } from './controllers/agent.controller';
import { AgentEntity } from './entities/agent.entity';
import { ChatEntity } from './entities/chats.entity';
import { UserModule } from '@user/user.module';
import { TemplateAgentService } from './services/template.service';
import { ToolModule } from '@tools/tool.module';
import { ChatsService } from './services/chats.service';
import { ChatController } from './controllers/chat.controller';
import { TokensService } from './services/tokens.service';
import { TokensController } from './controllers/tokens.controller';
import { TokenEntity } from './entities/token.entity';
import { AdminModule } from '@admin/admin.module';
import { AuthModule } from '@auth/auth.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([AgentEntity, ChatEntity, TokenEntity]),
    forwardRef(() => UserModule),
    forwardRef(() => ToolModule),
    forwardRef(() => AdminModule),
    forwardRef(() => AuthModule),
  ],
  providers: [AgentService, TemplateAgentService, ChatsService, TokensService],
  controllers: [AgentController, ChatController, TokensController],
  exports: [AgentService], // export if other modules need AgentService
})
export class AgentModule {}
