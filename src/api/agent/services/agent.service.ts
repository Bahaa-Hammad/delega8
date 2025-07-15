import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { CreateAgentDto } from '../dto/create-agent.dto';
import { UpdateAgentDto } from '../dto/update-agent.dto';
import { AgentEntity } from '../entities/agent.entity';
import { In } from 'typeorm';
import { ToolEntity } from 'src/api/tool/entities/tool.entity';
import { ChatEntity } from '../entities/chats.entity';
import { UserService } from '@user/user.service';
import { LlmProviders } from 'src/common/llm/enums';
import { AgentType } from '@agents/types';
import { createCompiledGraphO } from '@src/core/agents/builder';
import { toAgentSpec } from '../transformer';
import * as fs from 'fs';
@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(AgentEntity)
    private readonly agentRepository: Repository<AgentEntity>,
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,

    private readonly dataSource: DataSource,
    private readonly userService: UserService,
  ) {}

  async create(
    userId: string,
    createAgentDto: CreateAgentDto,
  ): Promise<AgentEntity> {
    const { parentIds, childIds, toolIds, ...rest } = createAgentDto;

    const user = await this.userService.findFullOne(userId);
    // TODO make default model configurable
    rest.model = rest.model || {
      name: 'gpt-4o',
      provider: LlmProviders.OPENAI,
    };

    return this.dataSource.transaction(async (manager) => {
      const agentRepo = manager.getRepository(AgentEntity);

      // 1. Create the new agent with basic fields only
      let newAgent = agentRepo.create(rest);
      newAgent.user = user;
      newAgent = await agentRepo.save(newAgent); // newAgent now has an ID

      if (toolIds && toolIds.length > 0) {
        const toolRepo = manager.getRepository(ToolEntity);
        const tools = await toolRepo.findBy({ id: In(toolIds) });
        // Optional check if all tools found
        if (tools.length !== toolIds.length) {
          throw new NotFoundException('One or more tools not found.');
        }
        newAgent.tools = tools;
      }

      // 2. If parentIds were provided, link them as parents.
      //    Meaning: For each parent, the new agent is a child
      if (parentIds && parentIds.length > 0) {
        // Fetch all parents in one query
        const parents = await agentRepo.findBy({
          id: In(parentIds),
          user: { id: userId },
        });
        if (parents.length !== parentIds.length) {
          throw new NotFoundException(
            'One or more specified parent agents not found.',
          );
        }
        // Link the new agent to these parents (both ways)
        //  - newAgent.parents = parents
        //  - each parent's children array should include newAgent
        //    TypeORM automatically handles the many-to-many join table on save
        newAgent.parents = parents;
      }

      // 3. If childIds were provided, link them as children.
      if (childIds && childIds.length > 0) {
        // id: In(parentIds),
        const children = await agentRepo.findBy({
          id: In(childIds),
          user: { id: userId },
        });
        if (children.length !== childIds.length) {
          throw new NotFoundException(
            'One or more specified child agents not found.',
          );
        }
        newAgent.children = children;
      }

      // 4. Save again so that relationships are persisted in the join table.
      newAgent = await agentRepo.save(newAgent);

      // 5. Reload with parents and children to return a fully-hydrated object
      const createdAgent = await agentRepo.findOne({
        where: { id: newAgent.id, user: { id: userId } },
        relations: ['children', 'tools'],
      });

      return createdAgent;
    });
  }

  async findOne(id: string, userId: string): Promise<AgentEntity> {
    const agent = await this.agentRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['children', 'tools'],
    });
    if (!agent) {
      throw new NotFoundException(`AgentEntity with ID "${id}" not found`);
    }
    return agent;
  }

  async update(
    id: string,
    updateAgentDto: UpdateAgentDto,
    userId: string,
  ): Promise<AgentEntity> {
    const { parentIds, childIds, toolIds, ...rest } = updateAgentDto;

    return this.dataSource.transaction(async (manager) => {
      const agentRepo = manager.getRepository(AgentEntity);
      let agent = await agentRepo.findOne({
        where: { id, user: { id: userId } },
      });
      if (!agent) {
        throw new NotFoundException(`AgentEntity with ID "${id}" not found`);
      }

      // Update simple fields
      Object.assign(agent, rest);

      if (toolIds) {
        const toolRepo = manager.getRepository(ToolEntity);
        const tools = await toolRepo.findBy({ id: In(toolIds) });
        if (tools.length !== toolIds.length) {
          throw new NotFoundException('One or more tools not found.');
        }
        agent.tools = tools;
      }

      // If parentIds is provided, replace parents
      if (parentIds) {
        const parents = await agentRepo.findBy({
          id: In(parentIds),
          user: { id: userId },
        });
        if (parents.length !== parentIds.length) {
          throw new NotFoundException(
            'One or more specified parent agents not found.',
          );
        }
        agent.parents = parents;
      }

      // If childIds is provided, replace children
      if (childIds) {
        const children = await agentRepo.findBy({
          id: In(childIds),
          user: { id: userId },
        });
        if (children.length !== childIds.length) {
          throw new NotFoundException(
            'One or more specified child agents not found.',
          );
        }
        agent.children = children;
      }

      agent = await agentRepo.save(agent);
      // Reload with relations
      agent = await agentRepo.findOne({
        where: { id, user: { id: userId } },
        relations: ['parents', 'children', 'tools'],
      });
      return agent;
    });
  }

  // TODO: I want to know what agent is being called
  // TODO: I want to know what tools were called by the agent
  // TODO: I want to know if steps fails and why it failed
  async remove(id: string, userId: string): Promise<void> {
    const agent = await this.findOne(id, userId);
    await this.agentRepository.remove(agent);
  }

  async getDrawableAgent(id: string, userId: string): Promise<any> {
    const agent = await this.findWithAllChildren(id, userId, new Set(), [
      'children',
      'tools',
    ]);
    const spec = toAgentSpec(agent);
    console.log(spec);
    const compiledGraph = await createCompiledGraphO(spec);
    const drawableGraph = await compiledGraph.getGraphAsync();

    // save the graph to a file
    // draw the graph to a file
    const png = await drawableGraph.drawMermaidPng();
    fs.writeFileSync('graph.png', Buffer.from(await png.arrayBuffer()));

    return drawableGraph.toJSON();
  }

  async findWithAllChildren(
    id: string,
    userId: string,
    visited = new Set<string>(),
    extraRelations: string[] = [],
  ): Promise<AgentEntity> {
    // Avoid infinite loops in case of cycles:
    if (visited.has(id)) {
      // or throw an error if cycles are unexpected
      return null;
    }
    visited.add(id);

    const agent = await this.agentRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['children', 'tools', ...extraRelations],
    });

    if (!agent) {
      throw new NotFoundException(`AgentEntity with ID "${id}" not found`);
    }

    // Recursively load children
    if (agent.children && agent.children.length > 0) {
      for (let i = 0; i < agent.children.length; i++) {
        const childId = agent.children[i].id;
        agent.children[i] = await this.findWithAllChildren(
          childId,
          userId,
          visited,
          ['children', 'tools', ...extraRelations],
        );
      }
    }

    return agent;
  }

  async findWithAllChildrenTemplate(
    id: string,
    visited = new Set<string>(),
    extraRelations: string[] = [],
  ): Promise<AgentEntity> {
    if (visited.has(id)) {
      return null;
    }
    visited.add(id);

    const agent = await this.agentRepository.findOne({
      where: { id },
      relations: ['children', 'tools', ...extraRelations, 'children.tools'],
    });

    if (!agent) {
      throw new NotFoundException(`AgentEntity with ID="${id}" not found`);
    }

    // Optional: ensure agent.type is TEMPLATE (or another condition)
    if (agent.type !== AgentType.TEMPLATE) {
      throw new NotFoundException(
        `Agent with ID="${id}" is not a TEMPLATE agent.`,
      );
    }

    // DFS recursion
    if (agent.children?.length) {
      for (let i = 0; i < agent.children.length; i++) {
        agent.children[i] = await this.findWithAllChildrenTemplate(
          agent.children[i].id,
          visited,
          extraRelations,
        );
      }
    }

    return agent;
  }

  async findAll(userId: string): Promise<AgentEntity[]> {
    return this.agentRepository.find({
      where: { user: { id: userId } },
    });
  }

  async findSingleAgentById(id: string): Promise<AgentEntity> {
    return this.agentRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }
}
