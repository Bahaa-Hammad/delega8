// test/steps/javascript/javascript-step.e2e-spec.ts

import { createJavaScriptStep } from '@src/core/steps/steps/javascript/javascript';
import { JavaScriptStepSpec } from '@src/core/steps/steps/javascript/types';

/**
 * Example test for a JavaScript step that runs arbitrary code in an isolated VM.
 */
describe('JavaScript Step (e2e)', () => {
  it('should run the provided code and return the result in context.__result', async () => {
    // 1) Create a sample JavaScript step spec
    const sampleStepSpec: JavaScriptStepSpec = {
      type: 'javascript',
      code: `
        // This is user code. Let's do a small operation:
        const sum = context.x + context.y;
        return sum;
      `,
      outputNamespace: 'jsOutput',
      isLoop: false,
      loopOn: undefined,
      conditions: [],
    };

    // 2) Build the step
    const jsStep = createJavaScriptStep(sampleStepSpec);

    // 3) Prepare context with x and y
    const context = {
      x: 3,
      y: 5,
    };

    // 4) Invoke the step
    const output = await jsStep.func(context);
    // output should look like: { result: <whatever user code returned> }

    // 5) Validate the result
    expect(output).toHaveProperty('result');
    expect(output.result).toBe(8); // 3 + 5
  });

  it('should handle placeholders in code', async () => {
    // Suppose we want to insert "context.z" from the parent context
    // via placeholders.
    const sampleStepSpec: JavaScriptStepSpec = {
      type: 'javascript',
      code: `
        // We'll use "context.z" from the parent. This line is a placeholder 
        // replaced: {zPlaceholder}
        return context.z;
      `,
      outputNamespace: 'jsOutput',
      isLoop: false,
      loopOn: undefined,
      conditions: [],
    };

    const jsStep = createJavaScriptStep(sampleStepSpec);

    // The code has {zPlaceholder}, so let's pass it in context
    const context = {
      z: 42,
      zPlaceholder: 'context.z', // if your placeholder logic replaces {zPlaceholder} => "context.z"
    };

    const output = await jsStep.func(context);

    expect(output).toHaveProperty('result');
    expect(output.result).toBe(42);
  });

  it('should default to undefined if user code returns nothing', async () => {
    const sampleStepSpec: JavaScriptStepSpec = {
      type: 'javascript',
      code: `
        // no return
        const x = 1 + 2;
      `,
      outputNamespace: 'jsOutput',
      isLoop: false,
      loopOn: undefined,
      conditions: [],
    };

    const jsStep = createJavaScriptStep(sampleStepSpec);
    const context = {};
    const output = await jsStep.func(context);

    // If the user code doesn't return anything, we get { result: undefined }
    expect(output).toHaveProperty('result');
    expect(output.result).toBeUndefined();
  });
});
