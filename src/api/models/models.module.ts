// models/models.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelsService } from './model.service';
import { ModelsController } from './model.controller';
import { ModelEntity } from './model.entity';
import { AuthModule } from '@auth/auth.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [TypeOrmModule.forFeature([ModelEntity]), AuthModule, AdminModule],
  controllers: [ModelsController],
  providers: [ModelsService],
  exports: [ModelsService], // export if needed in other modules
})
export class ModelsModule {}
