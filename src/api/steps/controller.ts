import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StepsService } from './service';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('steps')
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  @Get()
  getStepTypes() {
    return this.stepsService.getAvailableStepTypes();
  }

  @Get('schemas')
  getAllSchemas() {
    return this.stepsService.getAllStepsIOAsJson();
  }

  @Get('schemas/:stepType')
  async getSingleStepSchema(@Param('stepType') stepType: string) {
    const inputScheme =
      await this.stepsService.getStepInputSchemaAsJson(stepType);
    const outputScheme =
      await this.stepsService.getStepOutputSchemaAsJson(stepType);
    return { inputScheme, outputScheme };
  }
}
