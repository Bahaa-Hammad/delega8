import { CompositeToolConfigSpec } from '@core/tools/types';
import { z, ZodObject } from 'zod';
import { DynamicStructuredTool } from 'langchain/tools';
import { buildZodFieldsSchema } from '../zod-scheme-builder';

import { createStepUnionSchema } from '@core/steps/builder';
import { generateStepSchemas } from '@core/steps/builder';
import { runCompositeSteps } from './executor';
import { createStepFromConfig } from '@core/steps/steps/factory';

export function createToolFromConfig(
  config: CompositeToolConfigSpec,
): DynamicStructuredTool {
  // Validate the configuration using your composite schema
  createCompositeToolSchema(config);

  // Build a dynamic schema from the provided fields
  // This is what will be used by the agent
  const schema = buildZodFieldsSchema(config.fields);

  // Convert each step configuration into an executable step
  const executableSteps = config.steps.map(createStepFromConfig);

  return new DynamicStructuredTool({
    name: config.name,
    description: config.description,
    schema,
    func: async (params, metadata) => {
      // Parse and validate input parameters using the schema
      console.log('params', params);
      const validatedParams = schema.parse(params);

      // Initialize context with validated parameters
      const initialContext = { ...validatedParams };

      // Run all steps sequentially using the shared context
      const finalContext = await runCompositeSteps(
        executableSteps,
        initialContext,
      );
      console.log('finalContext', finalContext);
      // Return the aggregated outputs as a JSON string
      return finalContext;
    },
  });
}

export async function createToolsFromConfigs(
  toolConfigs: CompositeToolConfigSpec[],
) {
  return toolConfigs.map((toolConfig) => createToolFromConfig(toolConfig));
}

const fieldSpecSchema = z.object({
  name: z.string(),
  type: z.enum([
    'string',
    'number',
    'boolean',
    'object',
    'array_string',
    'secureString',
  ]),
  description: z.string().optional(),
  default: z.any().optional(),
  optional: z.boolean().optional(),
  // etc. if you have more fields
});

function createCompositeToolSchema(
  config: CompositeToolConfigSpec,
): z.ZodObject<any> {
  // Build a dynamic schema from the provided field

  // Generate schemas for each step using the map
  const stepSchemas = generateStepSchemas(config.steps);

  // Create a union schema for steps
  const stepUnionSchema = createStepUnionSchema(stepSchemas);

  // Construct the composite tool configuration schema
  const compositeToolConfigSchema = z.object({
    name: z.string(),
    description: z.string(),
    fields: z.array(fieldSpecSchema),
    steps: z
      .array(stepUnionSchema)
      .min(1, 'A tool must have at least one step.'),
  });

  // Optionally validate the configuration here
  compositeToolConfigSchema.parse(config);

  return compositeToolConfigSchema;
}
