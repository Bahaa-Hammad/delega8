import { IsString, IsOptional, Matches } from 'class-validator';
import { FieldSpec } from '@core/types';
import { StepSpec } from '@core/steps/types';

export class CreateToolDto {
  @IsString()
  @Matches(/^[^\s]+$/, {
    message: 'Name cannot contain spaces',
  })
  name: string;

  @IsString()
  originalId?: string;

  @IsOptional()
  steps?: StepSpec[];

  @IsOptional()
  fields?: FieldSpec[];

  @IsString()
  description: string;

  @IsString()
  publishedBy?: string;
}
