// models/models.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ModelsService } from './model.service';
import { CreateModelDto } from './dtos/create-model.dto';
import { UpdateModelDto } from './dtos/update-model.dto';
import { ModelEntity } from './model.entity';
import { AdminGuard } from 'src/api/admin/admin.guard';
import { JwtAuthGuard } from '@auth/jwt-auth.guard';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @UseGuards(AdminGuard)
  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() createModelDto: CreateModelDto): Promise<ModelEntity> {
    return this.modelsService.create(createModelDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(): Promise<ModelEntity[]> {
    return this.modelsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('available')
  getAvailableModels(): Promise<ModelEntity[]> {
    return this.modelsService.getAvailableModels();
  }

  @UseGuards(JwtAuthGuard)
  @Get('name/:name')
  getModelByName(@Param('name') name: string): Promise<ModelEntity> {
    return this.modelsService.getModelByName(name);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string): Promise<ModelEntity> {
    return this.modelsService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(
    @Param('id') id: string,
    @Body() updateModelDto: UpdateModelDto,
  ): Promise<ModelEntity> {
    return this.modelsService.update(id, updateModelDto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.modelsService.remove(id);
  }

  /**
   * Example endpoint to toggle a model’s availability.
   */
  @UseGuards(AdminGuard)
  @Patch(':id/toggle-availability')
  toggleAvailability(@Param('id') id: string): Promise<ModelEntity> {
    return this.modelsService.toggleAvailability(id);
  }
}
