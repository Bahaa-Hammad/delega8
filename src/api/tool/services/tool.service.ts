import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateToolDto } from '../dto/create-tool.dto';
import { UpdateToolDto } from '../dto/update-tool.dto';
import { ToolEntity } from '../entities/tool.entity';
import { toCompositeToolConfigSpec } from '../transformer';
import { createToolFromConfig } from '@core/tools/builder';
import { ToolInvocationEntity } from '../entities/invocations.entity';
import { ToolInvocationStatus, ToolInvokeOnFly } from '../types';
import { UserService } from '@user/user.service';
@Injectable()
export class ToolService {
  constructor(
    @InjectRepository(ToolEntity)
    private readonly toolRepository: Repository<ToolEntity>,
    @InjectRepository(ToolInvocationEntity)
    private readonly toolInvocationRepository: Repository<ToolInvocationEntity>,
    private readonly userService: UserService,
  ) {}

  async create(
    userId: string,
    createToolDto: CreateToolDto,
  ): Promise<ToolEntity> {
    const user = await this.userService.findFullOne(userId);

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const tool = this.toolRepository.create(createToolDto);
    tool.user = user;

    const savedTool = await this.toolRepository.save(tool);

    // ensure the user is not returned
    return {
      ...savedTool,
    };
  }

  async findAll(userId: string): Promise<ToolEntity[]> {
    // ensure user is not returned
    return this.toolRepository.find({
      relations: ['agents'],
      where: { user: { id: userId } },
      select: {
        user: {
          id: true,
          email: true,
          name: true,
        },
      },
    });
  }

  async findOne(id: string, userId: string): Promise<ToolEntity> {
    const tool = await this.toolRepository.findOne({
      where: { id, user: { id: userId } },
      relations: [],
    });
    if (!tool) {
      throw new NotFoundException(`ToolEntity with ID "${id}" not found`);
    }
    return tool;
  }

  async update(
    id: string,
    updateToolDto: UpdateToolDto,
    userId: string,
  ): Promise<ToolEntity> {
    const tool = await this.findOne(id, userId);
    Object.assign(tool, updateToolDto);
    const updatedTool = await this.toolRepository.save(tool);

    // ensure the user is not returned
    return {
      ...updatedTool,
    };
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      const tool = await this.findOne(id, userId);
      await this.toolRepository.remove(tool);
    } catch (error) {
      console.error('Error removing tool', error);
      throw error;
    }
  }

  async invoke(id: string, userId: string, input: any): Promise<any> {
    const invocation = new ToolInvocationEntity();
    invocation.input = input;
    invocation.tool = await this.findOne(id, userId);

    const spec = toCompositeToolConfigSpec(invocation.tool);
    const tool = createToolFromConfig(spec);

    try {
      const result = await tool.invoke(input);
      invocation.status = ToolInvocationStatus.SUCCESS;
      invocation.output = result;
      invocation.createdAt = new Date();
      await this.toolInvocationRepository.save(invocation);

      return result;
    } catch (error) {
      invocation.status = ToolInvocationStatus.ERROR;
      invocation.error = error.message;
      await this.toolInvocationRepository.save(invocation);

      return {
        status: ToolInvocationStatus.ERROR,
        error: error.message,
      };
    }
  }

  async invokeOnFly(payload: ToolInvokeOnFly): Promise<any> {
    const toolEntity = this.toolRepository.create(payload.toolDefinition);
    const spec = toCompositeToolConfigSpec(toolEntity);
    const tool = createToolFromConfig(spec);

    try {
      const result = await tool.invoke(payload.input);

      return result;
    } catch (error) {
      return {
        status: ToolInvocationStatus.ERROR,
        error: error.message,
      };
    }
  }

  async bulkInvoke(
    toolId: string,
    inputs: any[],
    userId: string,
  ): Promise<any[]> {
    const toolEntity = await this.findOne(toolId, userId);
    const spec = toCompositeToolConfigSpec(toolEntity);
    const tool = createToolFromConfig(spec);

    // Prepare all invocation records
    const invocations = inputs.map((input) => {
      const invocation = new ToolInvocationEntity();
      invocation.input = input;
      invocation.tool = toolEntity;
      return invocation;
    });
    const results = await Promise.all(
      invocations.map(async (invocation) => {
        try {
          const result = await tool.invoke(invocation.input);
          invocation.status = ToolInvocationStatus.SUCCESS;
          invocation.output = result;
        } catch (error) {
          invocation.status = ToolInvocationStatus.ERROR;
          invocation.error = error.message;
        }

        invocation.createdAt = new Date();
        await this.toolInvocationRepository.save(invocation);
        return invocation;
      }),
    );

    return results.map((r) =>
      r.status === ToolInvocationStatus.SUCCESS
        ? r
        : {
            status: ToolInvocationStatus.ERROR,
            error: r.error,
          },
    ); // Each invocation has its own status (SUCCESS or ERROR)
  }

  async getInvocations(
    userId: string,
    toolId: string,
  ): Promise<ToolInvocationEntity[]> {
    return this.toolInvocationRepository.find({
      where: { tool: { id: toolId, user: { id: userId } } },
    });
  }

  async getInvocation(
    userId: string,
    toolId: string,
    invocationId: string,
  ): Promise<ToolInvocationEntity> {
    return this.toolInvocationRepository.findOne({
      where: {
        id: invocationId,
        tool: { id: toolId, user: { id: userId } },
      },
    });
  }
}
