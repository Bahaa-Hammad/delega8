// test/api/agents/agent-publish-clone.e2e-spec.ts

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getAdminTokens, getApp, getUserTokens } from '../../setupAfterEnv';

/**
 * A three-level template payload:
 * - Root agent has 2 tools,
 * - Child agent has 1 tool,
 * - Grandchild agent has 1 tool,
 * ensuring we have 4 total.
 */
const threeLevelTemplatePayload = {
  name: 'RootAgentLevel0',
  description: 'Root agent with two tools',
  coreInstructions: 'Root instructions here',
  model: {
    provider: 'OPENAI',
    name: 'gpt-3.5-turbo',
    temperature: 0.7,
  },
  tools: [
    {
      name: 'RootTool1',
      description: 'First root tool',
      steps: [
        {
          type: 'llm',
          name: 'root-llm-step1',
          promptTemplate: 'Hello from RootTool1!',
          model: {
            provider: 'OPENAI',
            name: 'gpt-3.5-turbo',
            temperature: 0.7,
          },
          outputNamespace: 'rootTool1Output',
        },
      ],
    },
    {
      name: 'RootTool2',
      description: 'Second root tool',
      steps: [
        {
          type: 'api',
          name: 'call-external-api',
          verb: 'GET',
          baseUrl: 'https://example.com',
          outputNamespace: 'rootTool2Output',
        },
      ],
    },
  ],
  // Children (level 1)
  children: [
    {
      name: 'ChildAgentLevel1',
      description: 'A child agent specialized in data tasks',
      model: {
        provider: 'OPENAI',
        name: 'gpt-3.5-turbo',
        temperature: 0.5,
      },
      tools: [
        {
          name: 'ChildTool1',
          description: 'Tool on the child agent',
          steps: [
            {
              type: 'llm',
              name: 'child-llm-step',
              promptTemplate: 'Hello from ChildTool1!',
              model: {
                provider: 'OPENAI',
                name: 'gpt-3.5-turbo',
                temperature: 0.5,
              },
              outputNamespace: 'childTool1Output',
            },
          ],
        },
        // no second tool on child
      ],
      // Grandchild agent (level 2)
      children: [
        {
          name: 'GrandchildAgentLevel2',
          description: 'A grandchild with a single tool',
          model: {
            provider: 'OPENAI',
            name: 'gpt-3.5-turbo',
            temperature: 0.9,
          },
          tools: [
            {
              name: 'GrandchildTool1',
              description: 'Tool on the grandchild agent',
              steps: [
                {
                  type: 'llm',
                  name: 'grandchild-llm-step',
                  promptTemplate: 'Hello from GrandchildTool1!',
                  model: {
                    provider: 'OPENAI',
                    name: 'gpt-3.5-turbo',
                    temperature: 0.9,
                  },
                  outputNamespace: 'grandchildTool1Output',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      // second child with no tools
      name: 'ChildAgentLevel1b',
      description: 'Another child agent without tools or children',
      model: {
        provider: 'OPENAI',
        name: 'gpt-3.5-turbo',
        temperature: 0.6,
      },
    },
  ],
};

describe('Agent Publish & Clone Flow (E2E)', () => {
  let app: INestApplication;
  let userAccessToken: string;
  let adminAccessToken: string;

  let createdRootAgentId: string; // the agent created from template
  let publishedRootAgentId: string; // after admin publish
  let clonedRootAgentId: string; // after user clones published agent

  beforeAll(async () => {
    // 1) Get the app from global setup
    app = getApp();

    // 2) Suppose we have two tokens:
    // userAccessToken => normal user
    // adminAccessToken => admin user
    // Either retrieve them from your global test context or
    // do a login for user + admin as you prefer.
    const { accessToken } = getUserTokens();
    const { token } = getAdminTokens();
    userAccessToken = accessToken;
    adminAccessToken = token;

    // Increase the test timeout if needed
    jest.setTimeout(30000);
  });

  it('1) Create an agent from template', async () => {
    // The user calls: POST /agents/from-template
    const createRes = await request(app.getHttpServer())
      .post('/agents/from-template')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(threeLevelTemplatePayload)
      .expect(201);

    createdRootAgentId = createRes.body.id;
    expect(createdRootAgentId).toBeDefined();

    // fetch it to verify structure
    const getRes = await request(app.getHttpServer())
      .get(`/agents/${createdRootAgentId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    // Basic structure checks: root agent has 2 tools, 2 children
    const rootAgent = getRes.body;
    expect(rootAgent.tools).toHaveLength(2);
    expect(rootAgent.children).toHaveLength(2);
  });

  it('2) User requests publish on the agent', async () => {
    // user => POST /agents/:id/publish-requests
    const publishReqRes = await request(app.getHttpServer())
      .post(`/agents/${createdRootAgentId}/publish-requests`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(201); // or 200, depending on your endpoint

    // Possibly check the response if it returns updated status
    // e.g. UNDER_REVIEW
    expect(publishReqRes.body.status).toBe('UNDER_REVIEW');
    expect(publishReqRes.body.type).toBe('TEMPLATE');
    // your code sets them to UNDER_REVIEW / type: TEMPLATE
  });

  it('3) Admin publishes the agent and sub-agents', async () => {
    // admin => POST /agents/:id/publish
    const publishRes = await request(app.getHttpServer())
      .post(`/agents/${createdRootAgentId}/publish`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201); // or 200

    // This new "published" agent is typically a separate agent with user=null
    publishedRootAgentId = publishRes.body.id;
    expect(publishedRootAgentId).toBeDefined();

    // sanity check the returned published agent is type=template, user=null
    expect(publishRes.body.type).toBe('TEMPLATE');
    expect(publishRes.body.user).toBeUndefined();
    // or if your code doesn't return "user" property, you'd do another GET.

    // Optionally do a GET
    const getPubRes = await request(app.getHttpServer())
      .get(`/agents/templates/${publishedRootAgentId}`)
      // or if you do GET /agents/:id for system-level agents
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    // Check structure: same 2 tools, 2 children, etc., but user= null
    const publishedAgent = getPubRes.body;
    expect(publishedAgent.user).toBeUndefined();
    expect(publishedAgent.tools).toHaveLength(2);
    expect(publishedAgent.children).toHaveLength(2);

    // sub-children and sub-tools also present
  });

  it('4) User clones the published agent, verifying the structure', async () => {
    // user => POST /agents/:id/clone => clones the system-level template
    const cloneRes = await request(app.getHttpServer())
      .post(`/agents/${publishedRootAgentId}/clone`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(201); // or 200

    clonedRootAgentId = cloneRes.body.id;
    expect(clonedRootAgentId).toBeDefined();

    // Do a GET to see the final cloned structure
    const getCloneRes = await request(app.getHttpServer())
      .get(`/agents/${clonedRootAgentId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    const clonedAgent = getCloneRes.body;
    // The cloned agent is "user" = normal user, type= USER, status= DRAFT maybe
    // but structure (tools, children) is the same
    // or check name or email if your code returns them
    expect(clonedAgent.type).toBe('USER');
    expect(clonedAgent.tools).toHaveLength(2);
    expect(clonedAgent.children).toHaveLength(2);

    // We can do deeper checks. For example, ensure child/ grandchild also have the same tools.
    // E.g. sub-check the child's name, child's child's name, etc.
    const child1 = clonedAgent.children.find(
      (c: any) => c.name === 'ChildAgentLevel1',
    );
    expect(child1).toBeDefined();
    expect(child1.tools).toHaveLength(1);
    expect(child1.children).toHaveLength(1);

    const grandChild = child1.children[0];
    expect(grandChild.name).toBe('GrandchildAgentLevel2');
    expect(grandChild.tools).toHaveLength(1);
  });
});
