import { AgentSpec } from '@core/agents/types';
import { toCompositeToolConfigSpec } from 'src/api/tool/transformer';
import { AgentEntity } from './entities/agent.entity';

export function toAgentSpec(rawAgent: AgentEntity): AgentSpec {
  if (!rawAgent || typeof rawAgent !== 'object') {
    throw new Error('Invalid agent data: not an object.');
  }

  // Basic validations; expand as needed
  if (typeof rawAgent.name !== 'string') {
    throw new Error("AgentEntity must have a valid 'name' field.");
  }
  if (typeof rawAgent.coreInstructions !== 'string') {
    throw new Error("AgentEntity must have a valid 'coreInstructions' field.");
  }

  // Recursively build subAgents from children
  const subAgents: AgentSpec[] = Array.isArray(rawAgent.children)
    ? rawAgent.children.map((child: AgentEntity) => toAgentSpec(child))
    : [];

  // Convert raw tools to CompositeToolConfigSpec
  const tools = Array.isArray(rawAgent.tools)
    ? rawAgent.tools.map(toCompositeToolConfigSpec)
    : [];

  // Build the final AgentSpec
  return {
    id: rawAgent.id,
    name: rawAgent.name,
    description: rawAgent.description || '',
    coreInstructions: rawAgent.coreInstructions,
    model: rawAgent.model,
    subAgents,
    tools,
  };
}
