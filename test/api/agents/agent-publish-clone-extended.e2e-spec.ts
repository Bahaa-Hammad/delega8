// test/api/agents/agent-publish-clone-extended.e2e-spec.ts

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getAdminTokens, getApp, getUserTokens } from '../../setupAfterEnv';

/**
 * A four-level template payload:
 *
 * - Root agent has 2 tools
 * - Child #1 has 2 tools, one normal child, that child has 1 tool,
 *   and that child has a single sub-child with 1 tool
 * - Child #2 has 1 tool, no further children
 * - Child #3 has no tools, no children
 *
 * In total: 6 tools across the hierarchy.
 */
const extendedTemplatePayload = {
  name: 'RootAgentLevel0',
  description: 'An extended root agent with multiple children + deeper nesting',
  coreInstructions: 'Root-level instructions for extended scenario',
  model: {
    provider: 'OPENAI',
    name: 'gpt-3.5-turbo',
    temperature: 0.7,
  },
  // Root-level Tools
  tools: [
    {
      name: 'RootToolA',
      description: 'First root tool in extended template',
      steps: [
        {
          type: 'llm',
          name: 'root-llm-stepA',
          promptTemplate: 'Hello from RootToolA!',
          model: {
            provider: 'OPENAI',
            name: 'gpt-3.5-turbo',
            temperature: 0.7,
          },
          outputNamespace: 'rootToolAOutput',
        },
      ],
    },
    {
      name: 'RootToolB',
      description: 'Second root tool in extended template',
      steps: [
        {
          type: 'api',
          name: 'api-call-stepB',
          verb: 'GET',
          baseUrl: 'https://example.com/extended-endpoint',
          outputNamespace: 'rootToolBOutput',
        },
      ],
    },
  ],
  // Children (level 1)
  children: [
    {
      // Child #1
      name: 'ChildAgentLevel1A',
      description: 'First child agent with deeper nesting',
      coreInstructions: 'Focus on data tasks in extended scenario',
      model: {
        provider: 'OPENAI',
        name: 'gpt-3.5-turbo',
        temperature: 0.5,
      },
      // Tools for Child #1
      tools: [
        {
          name: 'Child1ToolX',
          description: 'Tool X on ChildAgentLevel1A',
          steps: [
            {
              type: 'llm',
              name: 'child1-llm-stepX',
              promptTemplate: 'Hello from Child1ToolX!',
              model: {
                provider: 'OPENAI',
                name: 'gpt-3.5-turbo',
                temperature: 0.5,
              },
              outputNamespace: 'child1ToolXOutput',
            },
          ],
        },
        {
          name: 'Child1ToolY',
          description: 'Tool Y on ChildAgentLevel1A for extended tasks',
          steps: [
            {
              type: 'llm',
              name: 'child1-llm-stepY',
              promptTemplate: 'Hello from Child1ToolY!',
              model: {
                provider: 'OPENAI',
                name: 'gpt-3.5-turbo',
                temperature: 0.4,
              },
              outputNamespace: 'child1ToolYOutput',
            },
          ],
        },
      ],
      // Sub-child (level 2)
      children: [
        {
          name: 'SubChildAgentLevel2A',
          description: 'A sub-child with further nesting',
          coreInstructions: 'Analytics on sub-level data tasks',
          model: {
            provider: 'OPENAI',
            name: 'gpt-3.5-turbo',
            temperature: 0.8,
          },
          tools: [
            {
              name: 'SubChildToolA',
              description: 'Tool on sub-child agent L2A',
              steps: [
                {
                  type: 'llm',
                  name: 'subchild-llm-stepA',
                  promptTemplate: 'Sub-child stepping in!',
                  model: {
                    provider: 'OPENAI',
                    name: 'gpt-3.5-turbo',
                    temperature: 0.8,
                  },
                  outputNamespace: 'subChildToolAOutput',
                },
              ],
            },
          ],
          // Sub-sub-child (level 3)
          children: [
            {
              name: 'SubSubChildAgentLevel3A',
              description: 'A deeper agent at level 3 with a single tool',
              coreInstructions: 'Very specialized tasks at level 3',
              model: {
                provider: 'OPENAI',
                name: 'gpt-3.5-turbo',
                temperature: 0.9,
              },
              tools: [
                {
                  name: 'SubSubChildToolZ',
                  description: 'Tool at the deepest level L3A',
                  steps: [
                    {
                      type: 'llm',
                      name: 'subsubchild-llm-stepZ',
                      promptTemplate: 'Hello from the deepest level!',
                      model: {
                        provider: 'OPENAI',
                        name: 'gpt-3.5-turbo',
                        temperature: 0.9,
                      },
                      outputNamespace: 'subsubChildToolZOutput',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      // Child #2
      name: 'ChildAgentLevel1B',
      description: 'Second child with a single tool, no children',
      model: {
        provider: 'OPENAI',
        name: 'gpt-3.5-turbo',
        temperature: 0.6,
      },
      tools: [
        {
          name: 'Child2ToolOnly',
          description: 'Single tool on ChildAgentLevel1B',
          steps: [
            {
              type: 'api',
              name: 'child2-api-step',
              verb: 'POST',
              baseUrl: 'https://example.com/child2-tool',
              outputNamespace: 'child2ToolOutput',
            },
          ],
        },
      ],
    },
    {
      // Child #3
      name: 'ChildAgentLevel1C',
      description: 'Third child agent with no tools or children',
      model: {
        provider: 'OPENAI',
        name: 'gpt-3.5-turbo',
        temperature: 0.55,
      },
    },
  ],
};

describe('Agent Publish & Clone Flow (EXTENDED E2E)', () => {
  let app: INestApplication;
  let userAccessToken: string;
  let adminAccessToken: string;

  let createdRootAgentId: string; // agent created from template
  let publishedRootAgentId: string; // after admin publish
  let clonedRootAgentId: string; // after user clones published agent

  beforeAll(() => {
    app = getApp();
    const { accessToken } = getUserTokens();
    const { token } = getAdminTokens();
    userAccessToken = accessToken;
    adminAccessToken = token;

    jest.setTimeout(45000);
  });

  it('1) Create an extended agent from template', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/agents/from-template')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(extendedTemplatePayload)
      .expect(201);

    createdRootAgentId = createRes.body.id;
    expect(createdRootAgentId).toBeDefined();

    // We'll do a GET to verify basic structure
    const getRes = await request(app.getHttpServer())
      .get(`/agents/${createdRootAgentId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    const rootAgent = getRes.body;
    // Root agent has 2 tools
    expect(rootAgent.tools).toHaveLength(2);
    // Root agent has 3 children
    expect(rootAgent.children).toHaveLength(3);
  });

  it('2) User requests publish on the extended agent', async () => {
    const publishReqRes = await request(app.getHttpServer())
      .post(`/agents/${createdRootAgentId}/publish-requests`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(201);

    // Check the agent is now UNDER_REVIEW / type=TEMPLATE
    expect(publishReqRes.body.status).toBe('UNDER_REVIEW');
    expect(publishReqRes.body.type).toBe('TEMPLATE');
  });

  it('3) Admin publishes the extended agent and sub-agents', async () => {
    const publishRes = await request(app.getHttpServer())
      .post(`/agents/${createdRootAgentId}/publish`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201); // or 200

    publishedRootAgentId = publishRes.body.id;
    expect(publishedRootAgentId).toBeDefined();
    // Possibly the code doesn't return user, so we won't check user.
    // We can do a final GET:
    const getPubRes = await request(app.getHttpServer())
      .get(`/agents/templates/${publishedRootAgentId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    const publishedAgent = getPubRes.body;
    // Root agent => 2 tools, 3 children
    expect(publishedAgent.tools).toHaveLength(2);
    expect(publishedAgent.children).toHaveLength(3);

    // We can check deeper structure or do it in the clone step
    // e.g. the first child "ChildAgentLevel1A" => has 2 tools, 1 child, etc.
    const childA = publishedAgent.children.find(
      (c: any) => c.name === 'ChildAgentLevel1A',
    );
    expect(childA).toBeDefined();
    expect(childA.tools).toHaveLength(2);

    // That child has 1 child => "SubChildAgentLevel2A"
    expect(childA.children).toHaveLength(1);
    // Then that child has 1 child => "SubSubChildAgentLevel3A"
    expect(childA.children[0].children).toHaveLength(1);
  });

  it('4) User clones the published extended agent, verifying the structure', async () => {
    const cloneRes = await request(app.getHttpServer())
      .post(`/agents/${publishedRootAgentId}/clone`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(201);

    clonedRootAgentId = cloneRes.body.id;
    expect(clonedRootAgentId).toBeDefined();

    // Now do a GET to see the final cloned structure
    const getCloneRes = await request(app.getHttpServer())
      .get(`/agents/${clonedRootAgentId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    const clonedAgent = getCloneRes.body;
    // The cloned root agent => 2 tools, 3 children
    expect(clonedAgent.tools).toHaveLength(2);
    expect(clonedAgent.children).toHaveLength(3);

    // Check Child #1
    const childA = clonedAgent.children.find(
      (c: any) => c.name === 'ChildAgentLevel1A',
    );
    expect(childA).toBeDefined();
    expect(childA.tools).toHaveLength(2);

    // That child has 1 child => "SubChildAgentLevel2A"
    expect(childA.children).toHaveLength(1);
    const subChildA = childA.children[0];
    expect(subChildA.tools).toHaveLength(1);

    // subChildA has 1 child => SubSubChildAgentLevel3A, with 1 tool
    expect(subChildA.children).toHaveLength(1);
    const subSubChild = subChildA.children[0];
    expect(subSubChild.name).toBe('SubSubChildAgentLevel3A');
    expect(subSubChild.tools).toHaveLength(1);

    // Check Child #2 => has 1 tool, no children
    const childB = clonedAgent.children.find(
      (c: any) => c.name === 'ChildAgentLevel1B',
    );
    expect(childB).toBeDefined();
    expect(childB.tools).toHaveLength(1);
    expect(childB.children).toHaveLength(0);

    // Check Child #3 => no tools, no children
    const childC = clonedAgent.children.find(
      (c: any) => c.name === 'ChildAgentLevel1C',
    );
    expect(childC).toBeDefined();
    expect(childC.tools).toHaveLength(0);
    expect(childC.children).toHaveLength(0);
  });
});
