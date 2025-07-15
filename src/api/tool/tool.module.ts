import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ToolService } from './services/tool.service';
import { ToolController } from './tool.controller';
import { ToolEntity } from './entities/tool.entity';
import { ToolInvocationEntity } from './entities/invocations.entity';
import { AuthModule } from '@auth/auth.module';
import { UserModule } from '@user/user.module';
import { TemplateToolService } from './services/template.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ToolEntity, ToolInvocationEntity]),
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule),
  ],
  providers: [ToolService, TemplateToolService],
  controllers: [ToolController],
  exports: [ToolService, TemplateToolService],
})
export class ToolModule {}
