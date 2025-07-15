import { PromptTemplate } from '@langchain/core/prompts';
import { createLLMOrDefault } from 'src/common/llm/factory';
import { ToolStep } from '@core/tools/types';
import { LlmStepOutput, LlmStepSpec } from './types';
import { buildZodFieldsSchema } from '@core/zod-scheme-builder';
function flattenObject(
  obj: any,
  prefix = '',
  res: Record<string, any> = {},
): Record<string, any> {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      flattenObject(val, newKey, res);
    } else {
      res[newKey] = val;
    }
  }
  return res;
}

export function createLlmStepDirect(
  config: LlmStepSpec,
): ToolStep<any, LlmStepOutput> {
  const promptTemplate = PromptTemplate.fromTemplate(config.promptTemplate);

  return {
    loopOn: config.loopOn,
    isLoop: config.isLoop || false,
    outputNamespace: config.outputNamespace,
    description: 'Use a language model to generate text',
    conditions: config.conditions,
    func: async (context: any): Promise<LlmStepOutput> => {
      console.log('Calling LLM step');
      const flattenedContext = flattenObject(context);
      console.log('Flattened context: ', flattenedContext);
      const prompt = await promptTemplate.format(flattenedContext);

      console.log('Prompt: ', prompt);
      console.log('Model: ', config.model);

      try {
        const llm = config.structuredOutputSpec
          ? createLLMOrDefault(config.model).withStructuredOutput(
              buildZodFieldsSchema(config.structuredOutputSpec),
            )
          : createLLMOrDefault(config.model);

        console.log('Prompt to LLM: ', prompt);
        const response = await llm.invoke(prompt);

        console.log('Response from LLM: ', response.content || response);

        if (config.structuredOutputSpec) {
          console.log('Structured output: ', response);
          return {
            structuredData: response || {},
          };
        }
        return {
          answer: response.content.toString() || '',
        };
      } catch (error) {
        console.error('Error invoking LLM: ', error);
        throw error;
      }
    },
  };
}
