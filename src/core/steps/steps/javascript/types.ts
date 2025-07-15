import { BaseStepSpec } from '@core/steps/types';

export interface JavaScriptStepSpec extends BaseStepSpec {
  type: 'javascript';
  code: string; // The user-supplied JavaScript to run
}

export interface JavaScriptStepOutput {
  result: any;
}
