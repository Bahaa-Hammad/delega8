import axios from 'axios';
import { replacePlaceholders } from '../helper';
import { ApiStepSpec, ApiStepOutput } from './types';
import { ToolStep } from '@core/tools/types';
export function createApiStepDirect(
  config: ApiStepSpec,
): ToolStep<any, ApiStepOutput> {
  return {
    loopOn: config.loopOn,
    isLoop: config.isLoop || false,
    outputNamespace: config.outputNamespace,
    description: 'Create an API request',
    conditions: config.conditions,

    func: async (context: any): Promise<ApiStepOutput> => {
      // 1) Replace placeholders across the *entire* step config in one pass
      //    This way, if something references {loopValue} or context.inputs.foo,
      //    we catch it here, so long as we pass the entire context.
      const finalSpec = replacePlaceholders(config, context);

      // 2) Extract replaced values
      const resolvedVerb = finalSpec.verb;
      const resolvedBaseUrl = finalSpec.baseUrl;
      const resolvedHeaders = finalSpec.headers;
      const resolvedQuery = finalSpec.query;
      const resolvedBody = finalSpec.body;

      // 3) Build final request
      let url = resolvedBaseUrl;
      let data: any = undefined;

      if (resolvedVerb?.toUpperCase() === 'GET') {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(resolvedQuery || {})) {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        }
        const qs = queryParams.toString();
        if (qs) {
          url += (url.includes('?') ? '&' : '?') + qs;
        }
      } else {
        // For POST, PUT, DELETE, etc.
        data = resolvedBody;
      }

      // 4) Perform request
      try {
        const response = await axios.request({
          method: resolvedVerb,
          url,
          headers: resolvedHeaders,
          data,
        });
        return {
          responseBody: response.data,
          statusCode: response.status,
        };
      } catch (error: any) {
        return {
          responseBody: `Error: ${error.message}`,
          statusCode: error.response?.status || 500,
        };
      }
    },
  };
}
