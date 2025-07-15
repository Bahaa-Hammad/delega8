import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { AuthModule } from 'src/api/auth/auth.module';
import { KnowledgeModule } from '../knowledge/module';
import { AgentModule } from '@agents/agent.module';
import { ToolModule } from '@tools/tool.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => KnowledgeModule),
    forwardRef(() => AgentModule),
    forwardRef(() => ToolModule),
  ],
  providers: [UserService],
  controllers: [UserController],
  exports: [UserService],
})
export class UserModule {}
