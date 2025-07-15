// models/models.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ModelEntity } from './model.entity';
import { CreateModelDto } from './dtos/create-model.dto';
import { UpdateModelDto } from './dtos/update-model.dto';
import { ModelAvailability, ModelProvider } from './enums';

@Injectable()
export class ModelsService {
  constructor(
    @InjectRepository(ModelEntity)
    private readonly modelRepository: Repository<ModelEntity>,
  ) {}

  async create(createModelDto: CreateModelDto): Promise<ModelEntity> {
    const model = this.modelRepository.create(createModelDto);

    // ensure api key is not returned in the response
    const savedModel = await this.modelRepository.save(model);
    return {
      ...savedModel,
      apiKey: undefined,
    };
  }

  async findAll(): Promise<ModelEntity[]> {
    return this.modelRepository.find();
  }

  async findOne(id: string): Promise<ModelEntity> {
    const model = await this.modelRepository.findOne({ where: { id } });
    if (!model) {
      throw new NotFoundException(`Model with ID "${id}" not found.`);
    }
    return model;
  }

  async update(
    id: string,
    updateModelDto: UpdateModelDto,
  ): Promise<ModelEntity> {
    const model = await this.findOne(id);
    Object.assign(model, updateModelDto);
    return this.modelRepository.save(model);
  }

  async remove(id: string): Promise<void> {
    const model = await this.findOne(id);
    await this.modelRepository.remove(model);
  }

  /**
   * Example: Toggle the model's availability.
   */
  async toggleAvailability(id: string): Promise<ModelEntity> {
    const model = await this.findOne(id);
    model.availability =
      model.availability === ModelAvailability.ENABLED
        ? ModelAvailability.DISABLED
        : ModelAvailability.ENABLED;
    return this.modelRepository.save(model);
  }

  async getAvailableModels(): Promise<ModelEntity[]> {
    return this.modelRepository.find({
      where: { availability: ModelAvailability.ENABLED },
    });
  }

  async getModelById(id: string): Promise<ModelEntity> {
    return this.modelRepository.findOne({ where: { id } });
  }

  async getModelByName(name: string): Promise<ModelEntity> {
    return this.modelRepository.findOne({ where: { name } });
  }

  async getModelByProvider(provider: ModelProvider): Promise<ModelEntity> {
    return this.modelRepository.findOne({ where: { provider } });
  }
  async findInternal(id: string): Promise<ModelEntity> {
    const query = this.modelRepository
      .createQueryBuilder('model')
      .where('model.id = :id', { id })
      .addSelect('model.apiKey');

    const model = await query.getOne();
    if (!model) {
      throw new NotFoundException(`Model with ID "${id}" not found.`);
    }
    return model;
  }
}
