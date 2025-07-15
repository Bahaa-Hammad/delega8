import {
  evaluateConditions,
  getNestedProperty,
} from '@core/steps/steps/helper';
import { ToolStep } from '@core/tools/types';

export async function runCompositeSteps(
  steps: ToolStep[],
  context: any,
): Promise<any> {
  for (const step of steps) {
    // 1) Check optional conditions
    if (step.conditions && !evaluateConditions(step.conditions, context)) {
      console.log(
        `Skipping step ${step.outputNamespace} due to failing conditions`,
      );
      continue;
    }

    // 2) Is it a loop step?
    if (step.isLoop) {
      const loopArray = getNestedProperty(context, step.loopOn);
      if (!Array.isArray(loopArray)) {
        throw new Error(
          `Step '${step.outputNamespace}' expects an array at '${step.loopOn}', but got ${typeof loopArray}`,
        );
      }

      // We'll accumulate all iteration results here
      // and run them in parallel with Promise.all
      const promises = loopArray.map((item) => {
        // We create an iteration-specific context with loopValue
        const iterationContext = { ...context, loopValue: item };
        return step.func(iterationContext);
      });

      // Parallelize all calls
      const results = await Promise.all(promises);

      // Store them in context
      context[step.outputNamespace] = results;
    } else {
      // 3) Single (non-loop) step, runs in the normal sequence
      const output = await step.func(context);
      context[step.outputNamespace] = output;
    }
  }

  return context;
}
