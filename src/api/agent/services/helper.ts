import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
/**
 * 1) Define a Zod schema for the tool’s input:
 *    - We only have a single field, `logs`, which is an array.
 */
const ConsolidateLogsInputSchema = z.object({
  logs: z.array(z.any()),
});

/**
 * 2) Build a “tool” that:
 *    - Takes the `logs` array
 *    - Calls an LLM to produce a single final answer
 */
export const ConsolidateLogsToSingleAnswerTool = {
  name: 'ConsolidateLogsToSingleAnswerTool',
  description: 'Takes a JSON array of logs and produces a single final answer',

  // The tool’s input must match this schema
  schema: ConsolidateLogsInputSchema,

  // The run() method does the actual work
  async run(input: z.infer<typeof ConsolidateLogsInputSchema>) {
    // 1. Extract logs

    const { logs } = input;
    const safeJson = JSON.stringify(logs, null, 2)
      .replace(/\{/g, '{{')
      .replace(/\}/g, '}}');
    // 2. Instantiate the LLM you want to use (e.g. GPT-3.5, GPT-4)
    //    Provide your own model name, temperature, API key, etc.
    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0,
    });

    // 3. Create a prompt to ask the LLM to produce one final answer from the logs
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `
You are a helpful assistant. I will give you a JSON array of logs from various agents/events. 
Your task is to produce a single, consolidated answer that include all the information from the logs. 
Do not just repeat the logs verbatim—extract the final, relevant or concluding output.`,
      ],
      HumanMessagePromptTemplate.fromTemplate(`
Here are the logs in JSON format:
    \`\`\`json
${safeJson}
\`\`\`

Please read them and produce a **single** final answer for the user, the answer should have not introduction or conclusion.
`),
    ]);

    // 4. Use an LLMChain to run the prompt
    const chain = prompt.pipe(llm);

    const response = await chain.invoke({ logs });
    return response.content;
  },
};
