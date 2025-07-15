import { StepSpec } from '@core/steps/types';
import { stepSchemaMap } from './steps/consts';
import { z } from 'zod';

export function generateStepSchemas(steps: StepSpec[]): z.ZodTypeAny[] {
  return steps.map((step) => {
    const schema = stepSchemaMap[step.type as keyof typeof stepSchemaMap].input;
    if (!schema) {
      throw new Error(`Unsupported step type: ${step.type}`);
    }
    return schema;
  });
}

export function createStepUnionSchema(schemas: z.ZodTypeAny[]): z.ZodTypeAny {
  if (schemas.length === 0) {
    throw new Error('At least one schema must be provided for union.');
  }
  if (schemas.length === 1) {
    // If only one schema is provided, return it directly.
    return schemas[0];
  }
  // For two or more schemas, create a union.
  return z.union(schemas as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
}
