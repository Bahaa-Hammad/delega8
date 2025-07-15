import { StepsController } from './controller';
import { StepsService } from './service';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [StepsController],
  providers: [StepsService],
  exports: [StepsService],
})
export class StepsModule {}
