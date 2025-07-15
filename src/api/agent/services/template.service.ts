import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AgentEntity } from '../entities/agent.entity';
import { AgentStatus, AgentType } from '@agents/types';
import { AgentService } from './agent.service';
import { TemplateToolService } from '@tools/services/template.service';
import { ImportAgentTreeDto } from '@agents/dto/create-agent.dto';
import { ToolService } from '@tools/services/tool.service';
import { UserEntity } from '@user/entities/user.entity';
import { ToolEntity } from '@tools/entities/tool.entity';

@Injectable()
export class TemplateAgentService {
  constructor(
    @InjectRepository(AgentEntity)
    private readonly agentRepository: Repository<AgentEntity>,
    private readonly agentService: AgentService,
    private readonly templateToolService: TemplateToolService,
    private readonly toolService: ToolService,
  ) {}

  async findAllTemplates(): Promise<AgentEntity[]> {
    return this.agentRepository.find({
      where: {
        type: AgentType.TEMPLATE,
        user: null,
      },
      relations: ['tools'], // Add required relations
    });
  }

  async findOneTemplate(id: string): Promise<AgentEntity> {
    const fullyLoaded = await this.agentService.findWithAllChildrenTemplate(id);
    return fullyLoaded;
  }

  public async requestPublishAgent(
    agentId: string,
    user: UserEntity,
  ): Promise<AgentEntity> {
    // 1) Load the entire sub-tree of agents for this user
    const rootAgent = await this.agentService.findWithAllChildren(
      agentId,
      user.id,
    );

    if (!rootAgent) {
      throw new NotFoundException(
        `Agent with ID="${agentId}" not found for user="${user.id}".`,
      );
    }

    // 2) Collect all agents in BFS/DFS order, plus all tool IDs
    const queue: AgentEntity[] = [rootAgent];
    const agentIds = new Set<string>();
    const toolIds = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;

      agentIds.add(current.id);

      if (current.tools) {
        for (const tool of current.tools) {
          toolIds.add(tool.id);
        }
      }

      if (current.children) {
        for (const child of current.children) {
          queue.push(child);
        }
      }
    }

    // 3) Update agent statuses in bulk to UNDER_REVIEW
    await this.agentRepository.update(
      { id: In([...agentIds]) },
      { status: AgentStatus.UNDER_REVIEW, type: AgentType.TEMPLATE },
    );

    // 4) Call toolService/templateToolService.requestPublish in a loop
    for (const toolId of toolIds) {
      try {
        await Promise.all([
          this.templateToolService.requestPublish(toolId, user.id),
        ]);
      } catch (error) {
        // If a tool is already under review/published, decide how to handle
        if (error instanceof BadRequestException) {
          console.log(`Tool ID="${toolId}" already under review/published.`);
        } else {
          throw error;
        }
      }
    }

    const fullyLoaded = await this.agentService.findWithAllChildren(
      agentId,
      user.id,
    );
    return fullyLoaded;
  }
  public async publishAgentAndSubagents(
    agentId: string,
    user: UserEntity,
  ): Promise<AgentEntity> {
    // 1) Fetch the full agent subtree belonging to the user
    const oldRoot = await this.agentService.findWithAllChildren(
      agentId,
      user.id,
    );
    if (!oldRoot) {
      throw new NotFoundException(
        `Agent with ID="${agentId}" not found for user="${user.id}".`,
      );
    }

    // 2) Recursively publish from the bottom up
    const newRoot = await this.publishAgentRecursively(oldRoot, user);

    // 3) Return the newly published root. If you want the entire nested
    //    structure included, either do a final find or rely on the
    //    in-memory references built by the recursion:
    //
    const fullyLoaded = await this.agentService.findWithAllChildrenTemplate(
      newRoot.id,
    );
    return fullyLoaded;
  }
  private async publishAgentRecursively(
    oldAgent: AgentEntity,
    publishingUser: UserEntity,
  ): Promise<AgentEntity> {
    // 1) Recursively publish each child first ("bottom-up")
    const newChildren: AgentEntity[] = [];
    if (oldAgent.children?.length) {
      for (const child of oldAgent.children) {
        const publishedChild = await this.publishAgentRecursively(
          child,
          publishingUser,
        );
        newChildren.push(publishedChild);
      }
    }

    // 2) Create a new "template" agent for the current oldAgent
    const { id, user, children, tools, ...restFields } = oldAgent;
    let newAgent = this.agentRepository.create({
      ...restFields,
      user: null, // system-level or "marketplace" agent
      status: AgentStatus.PUBLISHED,
      // optionally set `type: AgentType.TEMPLATE` if needed
      children: [],
      tools: [],
    });
    newAgent.children = newChildren;
    await this.agentRepository.save(newAgent);

    // 3) Publish/clone the oldAgent's tools
    if (oldAgent.tools?.length) {
      const newTools: ToolEntity[] = [];
      for (const oldTool of oldAgent.tools) {
        // Publish returns a brand-new ToolEntity with status=PUBLISHED
        const publishedTool =
          await this.templateToolService.publishOrReturnPublished(oldTool.id);
        // remove the agent = [] in publishedTool
        delete publishedTool.agents;
        if (publishedTool) {
          newTools.push(publishedTool);
        }
      }
      newAgent.tools = newTools;
      const agent = await this.agentRepository.save(newAgent);
    }

    // 4) Attach the newly published children to the new agent
    if (newChildren.length > 0) {
      for (const childAgent of newChildren) {
        // 'parents' is the owning side (where @JoinTable is defined), so:
        childAgent.parents = childAgent.parents ?? [];
        childAgent.parents.push(newAgent);
        await this.agentRepository.save(childAgent);
      }

      await this.agentRepository.save(newAgent);
      const reloadedAgent = await this.agentService.findWithAllChildrenTemplate(
        newAgent.id,
      );

      if (reloadedAgent) {
        newAgent = reloadedAgent;
      }
    }

    return newAgent;
  }
  public async cloneToUser(
    agentId: string,
    newUser: UserEntity,
  ): Promise<AgentEntity> {
    // 1) Load the entire subtree
    const root = await this.agentService.findWithAllChildrenTemplate(agentId);
    if (!root) {
      throw new NotFoundException(
        `Template Agent with ID="${agentId}" not found.`,
      );
    }

    // 2) BFS to gather all agents
    const visited = new Set<string>();
    const allAgents: AgentEntity[] = [];
    const queue: AgentEntity[] = [root];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (visited.has(current.id)) continue;

      visited.add(current.id);
      allAgents.push(current);

      if (current.children) {
        for (const child of current.children) {
          if (!visited.has(child.id)) {
            queue.push(child);
          }
        }
      }
    }

    // 3) Gather all tools from these agents
    const allToolsSet = new Set<ToolEntity>();
    for (const oldAgent of allAgents) {
      if (oldAgent.tools?.length) {
        for (const t of oldAgent.tools) {
          allToolsSet.add(t);
        }
      }
    }
    const allTools = Array.from(allToolsSet);

    // 4) Clone each tool in a single pass (no parallel)
    const oldToolIdToNewTool = new Map<string, ToolEntity>();
    for (const oldTool of allTools) {
      const newTool = await this.templateToolService.cloneToUser(
        oldTool.id,
        newUser.id,
      );
      delete newTool.agents;
      oldToolIdToNewTool.set(oldTool.id, newTool);
    }

    // 5) Create new agents (no children linked yet)
    const oldAgentIdToNewAgent = new Map<string, AgentEntity>();
    for (const oldAgent of allAgents) {
      const { id, children, tools, ...restFields } = oldAgent;
      const newAgent = this.agentRepository.create({
        ...restFields,
        status: AgentStatus.DRAFT,
        type: AgentType.USER,
        user: newUser,
        children: [],
        tools: [],
      });

      // Assign cloned tools
      if (tools?.length) {
        const newTools: ToolEntity[] = [];
        for (const t of tools) {
          const clonedTool = oldToolIdToNewTool.get(t.id);
          if (clonedTool) {
            newTools.push(clonedTool);
          }
        }
        newAgent.tools = newTools;
      }

      await this.agentRepository.save(newAgent);
      oldAgentIdToNewAgent.set(oldAgent.id, newAgent);
    }

    // 6) Link parent-child using the owning side `parents`
    for (const oldAgent of allAgents) {
      const newAgent = oldAgentIdToNewAgent.get(oldAgent.id);
      if (!newAgent) continue;

      if (oldAgent.children?.length) {
        for (const oldChild of oldAgent.children) {
          const newChild = oldAgentIdToNewAgent.get(oldChild.id);
          if (!newChild) continue;

          newAgent.children = newAgent.children ?? [];
          newAgent.children.push(newChild);
          const savedAgent = await this.agentRepository.save(newAgent);
        }
      }
    }

    // 7) Return the newly created root
    const newRoot = oldAgentIdToNewAgent.get(agentId);
    if (!newRoot) {
      throw new NotFoundException(
        `Failed to create a new root agent for "${agentId}".`,
      );
    }

    const fullyLoadedRoot = await this.agentService.findWithAllChildren(
      newRoot.id,
      newUser.id,
    );
    return fullyLoadedRoot;
  }

  async createAgentRecursively(
    spec: ImportAgentTreeDto,
    user: UserEntity,
  ): Promise<AgentEntity> {
    // 1) Create the new agent in memory
    const newAgent = this.agentRepository.create({
      name: spec.name,
      description: spec.description,
      coreInstructions: spec.coreInstructions,
      category: spec.category,
      tags: spec.tags,
      model: spec.model,
      user,
      status: AgentStatus.DRAFT,
      children: [],
      tools: [],
      // Include any other fields from `spec` as needed
    });

    // 2) Save immediately to get a DB ID
    await this.agentRepository.save(newAgent);

    // 3) Create the Tools via your ToolService
    if (spec.tools?.length) {
      const createdTools = [];
      for (const toolData of spec.tools) {
        // toolService.create expects (userId, createToolDto)
        const createdTool = await this.toolService.create(user.id, toolData);
        createdTools.push(createdTool);
      }
      newAgent.tools = createdTools;
      // Save again to attach Tools
      await this.agentRepository.save(newAgent);
    }

    // 4) Recursively create child agents
    if (spec.children?.length) {
      for (const childSpec of spec.children) {
        const childAgent = await this.createAgentRecursively(childSpec, user);
        // Attach child to this parent
        newAgent.children.push(childAgent);
      }
      // Save again to link children properly
      await this.agentRepository.save(newAgent);
    }

    return newAgent;
  }
}
