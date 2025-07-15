/**
 * builder.ts - Enhanced with loop guards, logging, and structured final output
 */

import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';
import { z } from 'zod';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { JsonOutputToolsParser } from '@langchain/core/output_parsers/openai_tools';
import { Runnable } from '@langchain/core/runnables';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { AgentSpec } from '@core/agents/types';

import { RunnableLambda } from '@langchain/core/runnables';

import { StateGraph, START, END } from '@langchain/langgraph';
import { createLLMOrDefault } from 'src/common/llm/factory';
import { GlobalState } from './state';
import { createToolsFromConfigs } from '@core/tools/builder';

interface ParsedOutput {
  args: {
    next: string;
    instructions: string;
    reasoning?: string;
  };
}

/**
 * We’ll store log entries in a simple interface.
 * You can replace with DB logs or something else.
 */
interface ExecutionLog {
  timestamp: Date;
  agentName: string;
  event: 'START' | 'SUCCESS' | 'ERROR' | 'TOOL_USE';
  message?: string;
  error?: string;
}

/**
 * Example method to store logs. In production, you might write to a DB,
 * external logging service, or push them to your NestJS logger.
 */
function recordLogEntry(state: typeof GlobalState.State, entry: ExecutionLog) {
  // For demonstration, we store logs in runtimeContext
  const logs = (state.runtimeContext?.executionLogs as ExecutionLog[]) || [];
  logs.push(entry);
  state.runtimeContext = {
    ...state.runtimeContext,
    executionLogs: logs,
  };
}

/**
 * A small guard to check if we've run too many steps.
 * If so, we forcibly finish to avoid infinite loops.
 */
function incrementAndCheckIteration(state: typeof GlobalState.State) {
  const limit = 15; // or set via config
  const iterCount = (state.runtimeContext?.iterationCount as number) ?? 0;
  const newCount = iterCount + 1;
  state.runtimeContext = {
    ...state.runtimeContext,
    iterationCount: newCount,
  };
  if (newCount >= limit) {
    // Exceeded iteration limit, force "FINISH"
    console.log('Iteration limit reached, forcing FINISH');
    return true;
  }
  return false;
}

// -----------------------------------------
// 1) Leaf agent node creation
// -----------------------------------------
export async function createLeafAgent(agentSpec: AgentSpec): Promise<Runnable> {
  // Build the LLM
  const llm = createLLMOrDefault(agentSpec.model);
  // Build the tools from config
  const tools = await createToolsFromConfigs(agentSpec.tools);

  return RunnableLambda.from(async (state: typeof GlobalState.State) => {
    // Step-limit check
    if (incrementAndCheckIteration(state)) {
      recordLogEntry(state, {
        timestamp: new Date(),
        agentName: agentSpec.name,
        event: 'ERROR',
        message: 'Max iteration limit reached, forcing FINISH',
      });

      const lastMessage = state.messages.at(-1);
      const snippet = {
        [agentSpec.name]: {
          messages: [
            {
              content: lastMessage.content,
              name: agentSpec.name,
            },
          ],
        },
      };

      const oldOutputs = state.runtimeContext.jsonOutputs || [];
      oldOutputs.push(snippet);
      // We can forcibly finalize the conversation:
      return {
        ...state,
        messages: [
          ...state.messages,
          new HumanMessage({
            content: lastMessage.content,
            name: agentSpec.id,
          }),
        ],
        runtimeContext: {
          ...state.runtimeContext,
          jsonOutputs: oldOutputs,
        }, // Let the top-level conditionalEdges handle it
      };
    }

    recordLogEntry(state, {
      timestamp: new Date(),
      agentName: agentSpec.name,
      event: 'START',
      message: 'Leaf agent invoked',
    });

    try {
      // Insert placeholders
      const userRuntime = state.runtimeContext ?? {};
      const systemInstructions = agentSpec.coreInstructions.replace(
        /\{(\w+)\}/g,
        (_, key) => userRuntime[key] ?? `{${key}}`,
      );

      // Build the agent
      const agent = createReactAgent({
        llm,
        tools,
        stateModifier: (s) => [
          new SystemMessage(systemInstructions),
          ...s.messages,
        ],
      });

      const result = await agent.invoke({ messages: state.messages });
      const lastMessage = result.messages.at(-1);

      recordLogEntry(state, {
        timestamp: new Date(),
        agentName: agentSpec.name,
        event: 'SUCCESS',
        message: `Leaf agent completed: ${lastMessage?.content?.slice(0, 60)}`,
      });

      const oldOutputs = state.runtimeContext.jsonOutputs || [];
      oldOutputs.push({ [agentSpec.name]: lastMessage.content });
      // Merge the final message into state
      return {
        ...state,
        messages: [
          ...state.messages,
          new HumanMessage({
            content: lastMessage.content,
            name: agentSpec.id,
          }),
        ],
        runtimeContext: {
          ...state.runtimeContext,
          jsonOutputs: oldOutputs,
        },
      };
    } catch (error) {
      recordLogEntry(state, {
        timestamp: new Date(),
        agentName: agentSpec.name,
        event: 'ERROR',
        error: String(error),
      });
      // Optionally short-circuit or set next=FINISH
      return {
        ...state,
        next: 'FINISH',
      };
    }
  });
}

// -----------------------------------------
// 2) Manager node creation
// -----------------------------------------
export async function createManagerNode(
  agentSpec: AgentSpec,
  childrenIDs: string[],
): Promise<Runnable> {
  const managerId = agentSpec.id;
  // Potential next targets:
  const options = ['FINISH', `${managerId}_selfLeaf`, ...childrenIDs];

  const llm = createLLMOrDefault(agentSpec.model);
  const routeTool = {
    name: 'route',
    description: 'Select the next agent or FINISH.',
    schema: z.object({
      reasoning: z.string().optional(),
      next: z.enum(options as [string, ...string[]]),
      instructions: z.string(),
    }),
  };

  const childListString = agentSpec.subAgents
    .map((c) => `${c.name} (ID: ${c.id})`)
    .join(', ');

  // The prompt ensures we produce a single JSON route call
  let prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `
You are the manager agent with ID: ${managerId}.
You may:
1) Handle the task yourself -> next="${managerId}_selfLeaf"
2) Delegate to sub-agents -> [${childListString}]
3) Or FINISH.

Return JSON only in the shape:
[
  {{
    "name": "route",
    "args": {{
      "next": "...",
      "instructions": "...",
      "reasoning": "..."
    }}
  }}
]
Where "next" is either "${managerId}_selfLeaf", one of the sub-agent IDs, or "FINISH".
`,
    ],
    new MessagesPlaceholder('messages'),
  ]);

  return RunnableLambda.from(async (state) => {
    // Step-limit guard
    if (incrementAndCheckIteration(state)) {
      recordLogEntry(state, {
        timestamp: new Date(),
        agentName: agentSpec.name,
        event: 'ERROR',
        message: 'Iteration limit for manager reached, forcing FINISH',
      });
      return {
        ...state,
        next: 'FINISH',
      };
    }

    recordLogEntry(state, {
      timestamp: new Date(),
      agentName: agentSpec.name,
      event: 'START',
      message: 'Manager node invoked',
    });

    try {
      // Possibly replace placeholders
      const userRuntime = { ...(state.runtimeContext || {}) };
      delete userRuntime.iterationCount; // remove anything that’s not in systemPrompt placeholders
      delete userRuntime.executionLogs;
      delete userRuntime.jsonOutputs;

      // Now do partial
      const managerPrompt = await prompt.partial(userRuntime);

      const llmOutput = await managerPrompt
        .pipe(
          llm.bindTools([routeTool], {
            tool_choice: 'route',
          }),
        )
        .pipe(new JsonOutputToolsParser<ParsedOutput[]>())
        .invoke({ messages: state.messages });

      const nextVal = llmOutput?.[0]?.args?.next ?? 'FINISH';
      const instructions = llmOutput?.[0]?.args?.instructions ?? '';
      const reasoning = llmOutput?.[0]?.args?.reasoning ?? '';
      recordLogEntry(state, {
        timestamp: new Date(),
        agentName: agentSpec.name,
        event: 'SUCCESS',
        message: `Manager decided next -> ${nextVal}`,
      });

      const snapshot = {
        supervisor: {
          next: nextVal,
          instructions,
          reasoning,
        },
      };
      const oldOutputs = state.runtimeContext.jsonOutputs || [];
      oldOutputs.push({ [agentSpec.name]: snapshot });
      return {
        ...state,
        next: nextVal,
        instructions: instructions,
        runtimeContext: {
          ...state.runtimeContext,
          jsonOutputs: oldOutputs,
        },
      };
    } catch (error) {
      recordLogEntry(state, {
        timestamp: new Date(),
        agentName: agentSpec.name,
        event: 'ERROR',
        error: String(error),
      });
      return {
        ...state,
        next: 'FINISH',
      };
    }
  });
}

// -----------------------------------------
// 3) Manager Self-Leaf creation
// -----------------------------------------
export async function createManagerSelfLeaf(
  agentSpec: AgentSpec,
): Promise<RunnableLambda<typeof GlobalState.State, typeof GlobalState.State>> {
  const llm = createLLMOrDefault(agentSpec.model);

  return RunnableLambda.from(async (state) => {
    if (incrementAndCheckIteration(state)) {
      recordLogEntry(state, {
        timestamp: new Date(),
        agentName: agentSpec.name + '_selfLeaf',
        event: 'ERROR',
        message: 'Iteration limit reached in managerSelfLeaf',
      });
      return {
        ...state,
        next: 'FINISH',
      };
    }

    recordLogEntry(state, {
      timestamp: new Date(),
      agentName: agentSpec.name + '_selfLeaf',
      event: 'START',
      message: 'Manager self-handling invoked',
    });

    try {
      const userRuntime = state.runtimeContext ?? {};
      let instructions = agentSpec.coreInstructions;
      instructions = instructions.replace(
        /\{(\w+)\}/g,
        (_, key) => userRuntime[key] ?? `{${key}}`,
      );

      const agent = createReactAgent({
        llm,
        tools: [],
        stateModifier: (s) => [new SystemMessage(instructions), ...s.messages],
      });

      const result = await agent.invoke({ messages: state.messages });
      const lastMessage = result.messages.at(-1);

      recordLogEntry(state, {
        timestamp: new Date(),
        agentName: agentSpec.name + '_selfLeaf',
        event: 'SUCCESS',
        message: `Self leaf done: ${lastMessage?.content.slice(0, 60)}`,
      });

      const oldOutputs = state.runtimeContext.jsonOutputs || [];
      oldOutputs.push({ [agentSpec.name]: lastMessage.content });
      return {
        ...state,
        messages: [...state.messages, lastMessage],
        runtimeContext: {
          ...state.runtimeContext,
          jsonOutputs: oldOutputs,
        },
      };
    } catch (error) {
      recordLogEntry(state, {
        timestamp: new Date(),
        agentName: agentSpec.name + '_selfLeaf',
        event: 'ERROR',
        error: String(error),
      });
      return {
        ...state,
        next: 'FINISH',
      };
    }
  });
}

// -----------------------------------------
// 4) Build the tree recursively
// -----------------------------------------
export async function buildGraphRecursive(
  spec: AgentSpec,
  globalStateClass: typeof GlobalState,
  initialContext?: Record<string, any>,
): Promise<StateGraph<typeof GlobalState.State>> {
  const graph = new StateGraph(globalStateClass);
  let lastNode: string = START;

  // Optionally init context:
  if (initialContext && Object.keys(initialContext).length > 0) {
    graph.addNode(
      'initContext',
      RunnableLambda.from(async (state: typeof GlobalState.State) => {
        return {
          ...state,
          runtimeContext: {
            ...state.runtimeContext,
            ...initialContext,
            iterationCount: 0, // track how many steps we do
            executionLogs: [],
            jsonOutputs: [],
          },
        };
      }),
    );
    graph.addEdge(START, 'initContext' as any);
    lastNode = 'initContext';
  }

  if (spec.subAgents && spec.subAgents.length > 0) {
    // Manager node
    const managerRunnable = await createManagerNode(
      spec,
      spec.subAgents.map((c) => c.id),
    );

    graph.addNode(spec.id, managerRunnable);

    const managerSelfLeaf = await createManagerSelfLeaf(spec);
    const managerSelfLeafId = `${spec.id}_selfLeaf`;
    graph.addNode(managerSelfLeafId, managerSelfLeaf);

    // Edge manager -> selfLeaf
    graph.addEdge(spec.id as any, managerSelfLeafId as any);
    graph.addEdge(lastNode as any, spec.id as any);

    // Build children
    const childGraphs: Record<
      string,
      StateGraph<typeof GlobalState.State>
    > = {};
    for (const childSpec of spec.subAgents) {
      childGraphs[childSpec.id] = await buildGraphRecursive(
        childSpec,
        globalStateClass,
      );
    }

    // Link children
    for (const childSpec of spec.subAgents) {
      const childCompiled = childGraphs[childSpec.id].compile();

      const childNode = RunnableLambda.from(
        async (parentState: typeof GlobalState.State) => {
          try {
            const childOutput = await childCompiled.invoke({
              messages: parentState.messages,
              instructions: parentState.instructions,
              runtimeContext: parentState.runtimeContext,
            });
            return {
              ...parentState,
              messages: childOutput.messages,
              instructions: childOutput.instructions,
              runtimeContext: childOutput.runtimeContext,
            };
          } catch (error) {
            recordLogEntry(parentState, {
              timestamp: new Date(),
              agentName: childSpec.name,
              event: 'ERROR',
              error: String(error),
            });
            // fallback or finalize
            return {
              ...parentState,
              next: 'FINISH',
            };
          }
        },
      );

      // Create a node for the child
      graph.addNode(childSpec.id, childNode);

      // sub-agent -> manager and -> managerSelfLeaf
      graph.addEdge(childSpec.id as any, spec.id as any);
      graph.addEdge(childSpec.id as any, managerSelfLeafId as any);
    }

    // Finally set up conditional edges from manager to sub-agents, or FINISH->END
    const mapping: Record<string, string> = {};
    for (const subSpec of spec.subAgents) {
      mapping[subSpec.id] = subSpec.id;
    }
    mapping[managerSelfLeafId] = managerSelfLeafId;
    mapping['FINISH'] = END;

    // Condition to pick next from manager’s output
    graph.addConditionalEdges(
      spec.id as any,
      (output) => output.next,
      mapping as Record<string, '__start__' | '__end__'>,
    );
    return graph;
  } else {
    // Leaf node
    const leafRunnable = await createLeafAgent(spec);
    graph.addNode(spec.id, leafRunnable);
    graph.addEdge(lastNode as any, spec.id as any);
    return graph;
  }
}

export async function createCompiledGraphO(rootSpec: AgentSpec) {
  const graph = await buildGraphRecursive(rootSpec, GlobalState);
  const compiled = graph.compile();
  return compiled;
}
