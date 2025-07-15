import { ChromaClientInternal } from './chroma/chroma';
import { Module } from '@nestjs/common';
@Module({
  imports: [],
  providers: [ChromaClientInternal],
  exports: [ChromaClientInternal],
})
export class CommonClientsModule {}
