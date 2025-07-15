import { CompositeToolConfigSpec } from '@core/tools/types';
import { LlmModel } from '@core/steps/steps/llm/types';

export interface AgentSpec {
  id: string; // Unique identifier for the agent
  name: string; // Name of the agent
  description: string; // Description of the agent's purpose
  coreInstructions: string; // The core instructions or system prompt for the agent
  model: LlmModel;
  subAgents: AgentSpec[];
  tools: CompositeToolConfigSpec[];
}
