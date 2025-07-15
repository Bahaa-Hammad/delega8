import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToolEntity } from '../entities/tool.entity';
import { ToolPublishStatus, ToolType } from '@tools/types';
import { UserService } from '@user/user.service';
import { CreateToolDto } from '@tools/dto/create-tool.dto';

@Injectable()
export class TemplateToolService {
  constructor(
    @InjectRepository(ToolEntity)
    private readonly toolRepository: Repository<ToolEntity>,
    private readonly userService: UserService,
  ) {}

  /**
   * Find all template tools that are published and globally available.
   */
  async findAllTemplates(): Promise<ToolEntity[]> {
    return this.toolRepository.find({
      where: {
        type: ToolType.TEMPLATE,
        publishStatus: ToolPublishStatus.PUBLISHED,
        user: null,
      },
      relations: [],
    });
  }

  /**
   * User requests publication (puts the tool into UNDER_REVIEW).
   */
  async requestPublish(toolId: string, userId: string): Promise<ToolEntity> {
    const tool = await this.toolRepository.findOne({
      where: { id: toolId, user: { id: userId } },
    });
    if (!tool) {
      throw new NotFoundException(
        `Tool with ID="${toolId}" not found for this user.`,
      );
    }

    if (tool.publishStatus === ToolPublishStatus.UNDER_REVIEW) {
      throw new BadRequestException(`Tool is already under review.`);
    }
    if (tool.publishStatus === ToolPublishStatus.PUBLISHED) {
      throw new BadRequestException(`Tool is already published.`);
    }

    tool.publishStatus = ToolPublishStatus.UNDER_REVIEW;

    return this.toolRepository.save(tool);
  }

  /**
   * Admin approves a publish by cloning the user’s tool into a new "TEMPLATE" tool
   * with status=PUBLISHED. The original remains as is (unless you want to update it, too).
   */
  async publish(toolId: string): Promise<ToolEntity> {
    const tool = await this.toolRepository.findOne({
      where: { id: toolId },
      relations: ['user'],
    });
    if (!tool) {
      throw new NotFoundException(`Tool with ID="${toolId}" not found.`);
    }
    if (tool.publishStatus !== ToolPublishStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Cannot publish tool if it's not UNDER_REVIEW.`,
      );
    }

    // Clone it as a new template
    const newTool = await this._cloneAsTemplate(tool);
    // ensure the user is not returned
    return {
      ...newTool,
      user: undefined,
    };
  }

  async publishOrReturnPublished(toolId: string): Promise<ToolEntity> {
    const existingTool = await this.toolRepository.findOne({
      where: { originalId: toolId },
    });
    if (existingTool) {
      return existingTool;
    }
    const tool = await this.toolRepository.findOne({
      where: { id: toolId },
      relations: ['user'],
    });

    if (!tool) {
      throw new NotFoundException(`Tool with ID="${toolId}" not found.`);
    }
    if (tool.publishStatus !== ToolPublishStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Cannot publish tool if it's not UNDER_REVIEW.`,
      );
    }

    // Clone it as a new template
    const newTool = await this._cloneAsTemplate(tool);
    // ensure the user is not returned
    return {
      ...newTool,
      user: undefined,
    };
  }

  private async _cloneAsTemplate(tool: ToolEntity): Promise<ToolEntity> {
    const overrides: Partial<ToolEntity> = {
      originalId: tool.id,
      type: ToolType.TEMPLATE,
      publishStatus: ToolPublishStatus.PUBLISHED,
      user: null, // system tool
      publishedBy: tool.user?.id,
      agents: [],
      invocations: [],
    };
    const newTool = this._cloneToolEntity(tool, overrides);
    return this.toolRepository.save(newTool);
  }

  /**
   * Clone a published template into a user-owned draft tool.
   */
  async cloneToUser(toolId: string, userId: string): Promise<ToolEntity> {
    const tool = await this.toolRepository.findOne({
      where: { id: toolId },
    });
    if (!tool) {
      throw new NotFoundException(`Tool with ID="${toolId}" not found.`);
    }

    // Make sure it's a valid template
    if (
      tool.publishStatus !== ToolPublishStatus.PUBLISHED ||
      tool.type !== ToolType.TEMPLATE
    ) {
      throw new BadRequestException(
        `Tool (ID=${toolId}) is not a published template.`,
      );
    }

    // Clone for user
    const newTool = await this._cloneForUser(tool, userId);
    // ensure the user is not returned
    return {
      ...newTool,
      user: undefined,
    };
  }

  // =========== PRIVATE HELPERS ===========

  /**
   * Clones a ToolEntity while excluding the "id", "agents", and "invocations" fields,
   * then applies overrides to produce a new entity.
   */
  private _cloneToolEntity(
    source: ToolEntity,
    overrides: Partial<ToolEntity>,
  ): ToolEntity {
    // 1) Destructure out fields to skip copying
    const { id, agents, invocations, ...copyableFields } = source;

    // 2) Create a new entity with the copyable fields
    const newTool = this.toolRepository.create(copyableFields);

    // 3) Apply overrides
    Object.assign(newTool, overrides);

    return newTool;
  }

  private async _cloneForUser(
    tool: ToolEntity,
    userId: string,
  ): Promise<ToolEntity> {
    const user = await this.userService.findFullOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID="${userId}" not found.`);
    }

    const overrides: Partial<ToolEntity> = {
      type: ToolType.USER,
      publishStatus: ToolPublishStatus.DRAFT,
      user,
      publishedBy: tool.publishedBy,
      agents: [],
      invocations: [],
    };
    const newTool = this._cloneToolEntity(tool, overrides);
    return this.toolRepository.save(newTool);
  }

  /**
   * Export a user's tool as a JSON-like object (removing IDs, user, etc.).
   */
  async exportAsJson(toolId: string, userId: string): Promise<CreateToolDto> {
    const tool = await this.toolRepository.findOne({
      where: { id: toolId, user: { id: userId } },
    });

    if (!tool) {
      throw new NotFoundException(
        `Tool with ID="${toolId}" not found for user="${userId}".`,
      );
    }

    // Omit fields you do NOT want in the export.
    const {
      id,
      user,
      agents,
      invocations,
      type,
      publishStatus,
      publishedBy,
      ...exportableFields
    } = tool;

    // Return the remaining fields as an object.
    return {
      ...exportableFields,
      originalId: tool.id,
    };
  }

  async importFromJson(
    data: CreateToolDto,
    userId: string,
  ): Promise<Partial<ToolEntity>> {
    const user = await this.userService.findFullOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID="${userId}" not found.`);
    }

    // Destructure out fields we don't want to carry over directly.

    // Create a new user-owned draft tool from the import data.
    const newTool = await this.toolRepository.save({
      ...data,
      type: ToolType.USER, // override to user type
      publishStatus: ToolPublishStatus.DRAFT, // default to DRAFT
      user, // attach the real user
      agents: [], // start with no agents
      invocations: [], // start with no invocations
    });

    // ensure the user is not returned
    return {
      ...newTool,
      user: undefined,
    };
  }
}
