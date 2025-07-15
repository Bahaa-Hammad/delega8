// test/tools/tools.e2e-spec.ts
import {
  createToolFromConfig,
  createToolsFromConfigs,
} from '@core/tools/builder';
import {
  byeToolConfig,
  helloToolConfig,
  toolWithConditions,
  toolWithLoop,
  toolWithMultipleSteps,
} from './samples';

/**
 * Example test suite for your composite tools
 */
describe('Composite Tools (e2e)', () => {
  // If you rely on real network calls (e.g., LLM or scraping),
  // you might want to increase the test timeout.
  beforeAll(() => {
    jest.setTimeout(30_000);
  });

  it('should create and run a single tool from config', async () => {
    // 1) Build the tool from the sample config
    const tool = createToolFromConfig(helloToolConfig);

    // 2) Check basic properties
    expect(tool.name).toBe(helloToolConfig.name);
    expect(tool.description).toBe(helloToolConfig.description);

    // 3) Provide input that matches the "fields" we defined
    const params = {
      userName: 'Alice',
    };

    // 4) Use the tool’s .func(...) method
    //    This calls 'runCompositeSteps' internally with the step(s) we specified
    const output = await tool.func(params);

    // 5) Because .func() returns JSON string,
    //    parse it if you want to check the final context

    // For an LLM step, we expect finalContext.llmOutput to exist
    expect(output).toHaveProperty('helloOutput');
    expect(typeof output.helloOutput.answer).toBe('string');
    // The actual text depends on the LLM’s response

    // If you had multiple steps or different outputs, check them here
  });

  it('should create tools from configs', async () => {
    const toolConfigs = [helloToolConfig, byeToolConfig];

    // 2) createToolsFromConfigs => returns an array of Tools
    const tools = await createToolsFromConfigs(toolConfigs);

    expect(tools.length).toBe(2);
    expect(tools[0].name).toBe(helloToolConfig.name);
    expect(tools[1].name).toBe(byeToolConfig.name);
  });

  it('should run a tool', async () => {
    const tool = createToolFromConfig(helloToolConfig);
    const output = await tool.func({ userName: 'Alice' });
    expect(output).toHaveProperty('helloOutput');
  });

  it('should run multiple tools', async () => {
    const tools = await createToolsFromConfigs([
      helloToolConfig,
      byeToolConfig,
    ]);
    const output = await tools[0].func({ userName: 'Alice' });
    expect(output).toHaveProperty('helloOutput');
  });

  it('should run a tool with a tool call', async () => {
    const tool = createToolFromConfig(toolWithMultipleSteps);
    const output = await tool.func({ userName: 'Alice' });
    expect(output).toHaveProperty('helloOutput');
    expect(output).toHaveProperty('byeOutput');
  });

  // increase the timeout
  it('should run a tool with loops', async () => {
    const tool = createToolFromConfig(toolWithLoop);
    const output = await tool.func({
      url: 'https://www.youtube.com/watch?v=tr5_S1FGoUI',
    });
    expect(output).toHaveProperty('llmOutput');
    expect(output).toHaveProperty('youtubeOutput');
    // check they are both arrays
    expect(Array.isArray(output.llmOutput)).toBe(true);
  });

  it('should run a tool with conditions', async () => {
    const tool = createToolFromConfig(toolWithConditions);
    const output = await tool.func({ shouldSayHello: true });
    expect(output).toHaveProperty('llmOutput');
  });

  it('should not run a tool with conditions', async () => {
    const tool = createToolFromConfig(toolWithConditions);
    const output = await tool.func({ shouldSayHello: false });
    expect(output).not.toHaveProperty('llmOutput');
  });
});
