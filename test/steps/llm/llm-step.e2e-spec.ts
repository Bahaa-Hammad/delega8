import { helloUsernameStep, llmStepWithStructuredOutput } from './llm-samples';
import { createLlmStepDirect } from '@src/core/steps/steps/llm/llm';

describe('LLM Step', () => {
  it('should invoke the LLM with the given prompt', async () => {
    // 2) Create the step function
    jest.retryTimes(3);

    const llmStep = createLlmStepDirect(helloUsernameStep);

    // 3) Create a context to pass to the step
    const context = {
      userName: 'Alice',
    };

    // 4) Invoke the step
    const result = await llmStep.func(context);

    // 5) Make some assertions
    //    Because this calls a real LLM, you typically either:
    //    - Mock out the LLM call, or
    //    - Just confirm the structure (e.g. result.answer is a string).
    // If you are using a real LLM in a test, the output can vary and cost tokens.
    // So consider mocking or stubbing if you want a stable test.

    expect(result).toHaveProperty('answer');
    expect(typeof result.answer).toBe('string');
  });

  it('should invoke the LLM with the given prompt and structured output', async () => {
    const llmStep = createLlmStepDirect(llmStepWithStructuredOutput);

    const result = await llmStep.func({});

    expect(result).toHaveProperty('structuredData');
    expect(result.structuredData).toHaveProperty('age');
    expect(result.structuredData).toHaveProperty('fatherName');
  });
});
