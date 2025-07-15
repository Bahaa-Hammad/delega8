import { BaseStepSpec } from '@core/steps/types';
import { z } from 'zod';
export interface ApiStepSpec extends BaseStepSpec {
  type: 'api';
  name: string;
  verb: string; // e.g. "GET", "POST", or a placeholder like "{verb}"
  baseUrl: string; // e.g. "https://example.com/{userId}"
  headers?: Record<string, any>;
  query?: Record<string, any>; // replaced from context for GET
  body?: Record<string, any>; // replaced from context for POST/PUT/DELETE
}

export interface ApiStepOutput {
  responseBody: any; // can be string or object, your choice
  statusCode: number;
}

export const apiStepOutputSchema = z.object({
  responseBody: z.any(),
  statusCode: z.number(),
});
