import { zodToJsonSchema } from 'zod-to-json-schema';
import * as RefParser from 'json-schema-ref-parser';
import { Injectable } from '@nestjs/common';
import { stepSchemaMap } from '@src/core/steps/steps/consts';

@Injectable()
export class StepsService {
  getAvailableStepTypes(): string[] {
    return Object.keys(stepSchemaMap);
  }

  // Return *input* schema for a single step
  async getStepInputSchemaAsJson(stepType: string) {
    const entry = stepSchemaMap[stepType];
    if (!entry) throw new Error(`Unknown step type: ${stepType}`);

    const rawSchema = zodToJsonSchema(entry.input, {
      name: stepType,
      $refStrategy: 'none', // fully inline
    });
    const dereferenced = await RefParser.dereference(rawSchema as any);

    const simplified = this.extractTopLevelSchema(dereferenced, stepType);
    return simplified;
  }

  async getStepOutputSchemaAsJson(stepType: string) {
    const entry = stepSchemaMap[stepType];
    if (!entry) throw new Error(`Unknown step type: ${stepType}`);

    const rawSchema = zodToJsonSchema(entry.output, {
      name: `${stepType}-output`,
      $refStrategy: 'none',
    });
    const dereferenced = await RefParser.dereference(rawSchema as any);

    const simplified = this.extractTopLevelSchema(
      dereferenced,
      `${stepType}-output`,
    );
    return simplified;
  }

  async getAllStepsIOAsJson() {
    const result: Record<string, { input: any; output: any }> = {};

    for (const stepType of this.getAvailableStepTypes()) {
      const entry = stepSchemaMap[stepType];
      const inputSchema = zodToJsonSchema(entry.input, {
        name: stepType,
        $refStrategy: 'none',
      });
      const outputSchema = zodToJsonSchema(entry.output, {
        name: `${stepType}-output`,
        $refStrategy: 'none',
      });

      const inDeref = await RefParser.dereference(inputSchema as any);
      const outDeref = await RefParser.dereference(outputSchema as any);

      result[stepType] = {
        input: this.extractTopLevelSchema(inDeref, stepType),
        output: this.extractTopLevelSchema(outDeref, `${stepType}-output`),
      };
    }
    return result;
  }

  private extractTopLevelSchema(
    schemaObj: any,
    definitionKey: string,
  ): Record<string, any> {
    // if definitions exist and contain the named key, pull it out
    if (schemaObj.definitions && schemaObj.definitions[definitionKey]) {
      const top = schemaObj.definitions[definitionKey];

      // optionally copy over $schema from the parent
      if (schemaObj.$schema) {
        top.$schema = schemaObj.$schema;
      }

      // remove extraneous fields
      delete top.$ref;
      delete schemaObj.definitions;
      delete schemaObj.$ref;
      delete schemaObj.$schema;

      return top;
    }

    // if we can't find definitions[definitionKey], just return as-is
    return schemaObj;
  }
}
