import { AgentSpec } from '@core/agents/types';
import {
  CreateAgentDto,
  ImportAgentTreeDto,
} from '@src/api/agent/dto/create-agent.dto';
import { CreateToolDto } from '@src/api/tool/dto/create-tool.dto';
import { LlmProviders } from '@src/common/llm/enums';

export const simpleAgent: CreateAgentDto = {
  name: 'Simple Agent',
  description: 'A simple agent',
  coreInstructions: 'You are a simple agent, just reply with "Hello, world!"',
  model: { name: 'gpt-4o', provider: LlmProviders.OPENAI },
  childIds: [],
  toolIds: [],
};

export const agentTemplate: ImportAgentTreeDto = {
  name: 'MainAgent',
  description: 'A top-level agent that handles various tasks',
  coreInstructions: 'Always respond in a concise and helpful manner.',
  category: 'Demo',
  tags: ['example', 'template'],
  model: {
    provider: LlmProviders.OPENAI,
    name: 'gpt-3.5-turbo',
    temperature: 0.7,
  },
  tools: [
    {
      name: 'TextParserTool',
      description: 'Parses text into structured data.',
      publishedBy: 'system',
      steps: [
        {
          type: 'llm',
          name: 'basic-llm-step',
          promptTemplate: 'Say "Hello, world!"',
          outputNamespace: 'parsedData',
          model: {
            provider: LlmProviders.OPENAI,
            name: 'gpt-3.5-turbo',
            temperature: 0.7,
          },
          id: 'basic-llm-step',
        },
      ],
    },
  ],
  children: [
    {
      name: 'SubAgent1',
      description: 'A subagent specializing in data analysis',
      coreInstructions: 'Focus on analyzing structured data thoroughly.',
      model: {
        provider: LlmProviders.OPENAI,
        name: 'gpt-3.5-turbo',
        temperature: 0.5,
      },
      children: [
        {
          name: 'SubAgent1_Child',
          description: 'A deeper subagent for advanced analysis tasks',
          coreInstructions:
            'Perform specialized, high-level analysis on universe theory.',
          model: {
            provider: LlmProviders.OPENAI,
            name: 'gpt-3.5-turbo',
            temperature: 0.8,
          },
        },
      ],
      tools: [
        {
          name: 'TextParserTool',
          description: 'Parses text into structured data.',
          steps: [
            {
              type: 'llm',
              name: 'basic-llm-step',
              promptTemplate: 'Say "Hello, world!"',
              outputNamespace: 'parsedData',
              model: {
                provider: LlmProviders.OPENAI,
                name: 'gpt-3.5-turbo',
                temperature: 0.7,
              },
              id: 'basic-llm-step',
            },
          ],
        },
      ],
    },
    {
      name: 'SubAgent2',
      description: 'Another specialized subagent for diverse tasks',
      model: {
        provider: LlmProviders.OPENAI,
        name: 'gpt-3.5-turbo',
        temperature: 0.6,
      },
    },
  ],
};

// test/api/agents/agent-samples.ts

/**
 * A minimal agent creation payload: "CreateAgentDto"
 * with no tools and no subagents.
 */
export const simpleAgentPayload = {
  name: 'Simple Agent',
  description: 'Just a single agent, no tools',
  // no parentIds, childIds, toolIds
};

/**
 * A more complex agent creation payload for sub-agents scenario.
 * We'll create the main agent, then create two child agents,
 * and in a later request link them up.
 */
export const subAgent1Payload: CreateAgentDto = {
  name: 'SubAgent A',
  description: 'First child agent',
  model: {
    provider: LlmProviders.OPENAI,
    name: 'gpt-3.5-turbo',
  },
};

export const subAgent2Payload: CreateAgentDto = {
  name: 'SubAgent B',
  description: 'Second child agent',
  model: {
    provider: LlmProviders.OPENAI,
    name: 'gpt-3.5-turbo',
  },
};

/**
 * An update payload to link the subAgents to the main agent
 */
export const linkSubAgentsPayload = {
  childIds: [], // We'll fill in the IDs after we create them
};

/**
 * A sample tool payload that references "CreateToolDto" shape
 */
export const mainAgentToolPayload: CreateToolDto = {
  name: 'MainAgentTool',
  description: 'A tool attached to the main agent',
  steps: [
    {
      type: 'api',
      name: 'Call an endpoint',
      verb: 'GET',
      baseUrl: 'https://example.com',
      id: 'mainAgentToolApiStep',
      outputNamespace: 'mainAgentToolOutput',
    },
  ],
};

export const subAgentToolPayload: CreateToolDto = {
  name: 'SubAgentTool',
  description: 'A tool attached to subAgent',
  steps: [
    {
      type: 'llm',
      name: 'LLM Step in SubAgent Tool',
      promptTemplate: 'Hello from subAgent tool!',
      model: {
        provider: LlmProviders.OPENAI,
        name: 'gpt-3.5-turbo',
      },
      outputNamespace: 'subAgentToolOutput',
      id: 'subAgentToolLLMStep',
    },
  ],
  fields: [],
};

/**
 * A sample "ImportAgentTreeDto" payload to create an agent from a template.
 * We'll define some children and tools in a single request.
 */
