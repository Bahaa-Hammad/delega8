import {
  IsOptional,
  IsString,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { LlmModel } from '@core/steps/steps/llm/types';
import { Type } from 'class-transformer';
import { CreateToolDto } from '@tools/dto/create-tool.dto';

export class CreateAgentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coreInstructions?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  /**
   * IDs of agents we want to mark as PARENTS of this new agent.
   * => "This new agent is the child of these existing agents"
   */
  @IsOptional()
  @IsArray()
  parentIds?: string[];

  /**
   * IDs of agents we want to mark as CHILDREN of this new agent.
   * => "This new agent is the parent of these newly linked child agents"
   */
  @IsOptional()
  @IsArray()
  childIds?: string[];

  @IsOptional()
  @IsArray()
  toolIds?: string[];

  @IsOptional()
  @IsObject()
  model?: LlmModel;
}

export class ImportAgentTreeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coreInstructions?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  model?: LlmModel;

  // Tools belonging to this agent
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateToolDto)
  tools?: CreateToolDto[];

  // Children subagents
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportAgentTreeDto)
  children?: ImportAgentTreeDto[];
}
