// knowledge.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeController } from './controller';
import { UserModule } from '@user/user.module';
import { TableEntity } from './entities/table';
import { ColumnEntity } from './entities/column';
import { RowEntity } from './entities/row';
import { TableService } from './services/table';
import { RowService } from './services/row';
import { EmbeddingService } from './services/embedding';
import { FileIngestionService } from './services/file-ingestion';
import { ToolModule } from '@tools/tool.module';
import { CommonClientsModule } from '@common/clients/module';
@Module({
  imports: [
    TypeOrmModule.forFeature([TableEntity, ColumnEntity, RowEntity]),
    forwardRef(() => UserModule),
    forwardRef(() => ToolModule),
    CommonClientsModule,
  ],
  controllers: [KnowledgeController],
  providers: [TableService, RowService, EmbeddingService, FileIngestionService],
  exports: [],
})
export class KnowledgeModule {}
