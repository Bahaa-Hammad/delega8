import { StepCondition } from '@core/steps/steps/helper';
import { Context, FieldSpec } from '@core/types';
import { StepSpec } from '@core/steps/types';
export interface CompositeToolConfig {
  name: string;
  description: string;
  fields: FieldSpec[]; // Fields to collect from user
  steps: ToolStep[]; // Steps to execute sequentially
}

export interface CompositeToolConfigSpec {
  id: string;
  name: string;
  description: string;
  fields: FieldSpec[];
  steps: StepSpec[];
}

export interface ToolStep<Input = Context, Output = Context> {
  description?: string;
  func: (context: Input) => Promise<Output>;
  isLoop?: boolean;
  loopOn?: string;
  outputNamespace: string;
  conditions?: StepCondition[];
}
