// models/dto/update-model.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateModelDto } from './create-model.dto';

export class UpdateModelDto extends PartialType(CreateModelDto) {
  // All fields become optional, but you can add extra validations
  // if something is only valid during updates.
}
