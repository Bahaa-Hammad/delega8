// models/dto/create-model.dto.ts

import {
  IsEnum,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
import { ModelAvailability, ModelProvider } from '../enums';
import { ModelParameters } from '../types';

export class CreateModelDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsEnum(ModelProvider)
  readonly provider: ModelProvider;

  @IsEnum(ModelAvailability)
  @IsOptional()
  readonly availability?: ModelAvailability;

  @IsString()
  @IsOptional()
  readonly description?: string;

  @IsObject()
  @IsOptional()
  // If you want to ensure certain shape, you can define a stricter validation
  readonly parameters?: ModelParameters;

  @IsString()
  @IsOptional()
  readonly apiKey?: string;
}
