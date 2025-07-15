// test/api/agents/agents.e2e-spec.ts

import * as request from 'supertest'; // or whichever HTTP client you use
import { INestApplication } from '@nestjs/common';
import { getApp, getUserTokens } from '../../setupAfterEnv'; // your global test app
import {
  simpleAgentPayload,
  subAgent1Payload,
  subAgent2Payload,
  linkSubAgentsPayload,
  mainAgentToolPayload,
  subAgentToolPayload,
  agentTemplate,
} from './samples';
describe('Agent E2E Tests', () => {
  let app: INestApplication;
  let userAccessToken: string; // or however you track tokens
  let createdMainAgentId: string;
  let createdSubAgentAId: string;
  let createdSubAgentBId: string;
  let createdMainToolId: string;
  let createdSubAgentToolId: string;

  beforeAll(async () => {
    // 1) Get the Nest app from your global setup
    app = getApp();

    // 2) Acquire or create a normal user token
    // e.g., from a fixture or by logging in
    const { accessToken } = getUserTokens();
    userAccessToken = accessToken;
  });

  // -----------------------------------------------------
  // TEST 1: Create a simple agent (no sub-agents, no tools)
  // -----------------------------------------------------
  it('should create a simple agent', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/agents')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(simpleAgentPayload)
      .expect(201);

    expect(createRes.body.id).toBeDefined();
    createdMainAgentId = createRes.body.id;

    // optional: check the response body
    expect(createRes.body.name).toBe(simpleAgentPayload.name);
    expect(createRes.body.description).toBe(simpleAgentPayload.description);
  });

  // -----------------------------------------------------------------------
  // TEST 2: Create sub-agents, attach them, create tools, attach them, verify
  // -----------------------------------------------------------------------
  it('should create sub-agents and attach them plus tools to the main agent', async () => {
    // 1) Create subAgent A
    const subARes = await request(app.getHttpServer())
      .post('/agents')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(subAgent1Payload)
      .expect(201);

    createdSubAgentAId = subARes.body.id;

    // 2) Create subAgent B
    const subBRes = await request(app.getHttpServer())
      .post('/agents')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(subAgent2Payload)
      .expect(201);

    createdSubAgentBId = subBRes.body.id;

    // 3) Link these sub-agents to the main agent
    //    We'll pass childIds in an update
    linkSubAgentsPayload.childIds = [createdSubAgentAId, createdSubAgentBId];

    const updateRes = await request(app.getHttpServer())
      .patch(`/agents/${createdMainAgentId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(linkSubAgentsPayload)
      .expect(200);

    // 4) Create a tool for the main agent
    const mainToolRes = await request(app.getHttpServer())
      .post('/tools') // or your actual endpoint for creating tools
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(mainAgentToolPayload)
      .expect(201);
    createdMainToolId = mainToolRes.body.id;

    // 5) Another tool for SubAgent A
    const subAgentToolRes = await request(app.getHttpServer())
      .post('/tools')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(subAgentToolPayload)
      .expect(201);
    createdSubAgentToolId = subAgentToolRes.body.id;

    // 6) Link the main tool to the main agent
    const attachMainToolPayload = {
      toolIds: [createdMainToolId],
    };
    await request(app.getHttpServer())
      .patch(`/agents/${createdMainAgentId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(attachMainToolPayload)
      .expect(200);

    // 7) Link the subAgent tool to subAgent A
    const attachSubAToolPayload = {
      toolIds: [createdSubAgentToolId],
    };
    await request(app.getHttpServer())
      .patch(`/agents/${createdSubAgentAId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(attachSubAToolPayload)
      .expect(200);

    // 8) Finally, get the main agent with children + tools => verify structure
    const getRes = await request(app.getHttpServer())
      .get(`/agents/${createdMainAgentId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    const agentData = getRes.body;
    expect(agentData.name).toBe('Simple Agent');
    expect(agentData.children.length).toBe(2);
    expect(agentData.tools.length).toBe(1);

    // subAgentA + subAgentB
    const childA = agentData.children.find(
      (c: any) => c.id === createdSubAgentAId,
    );
    const childB = agentData.children.find(
      (c: any) => c.id === createdSubAgentBId,
    );
    expect(childA.tools).toHaveLength(1);
    expect(childB.tools).toHaveLength(0);
  });

  // ------------------------------------------------------
  // TEST 3: Create an agent from a template
  // ------------------------------------------------------
  it('should create an agent from template, verifying tools + children', async () => {
    // 1) POST /agents/from-template
    const createRes = await request(app.getHttpServer())
      .post('/agents/from-template')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(agentTemplate)
      .expect(201);

    const templateAgentId = createRes.body.id;
    expect(templateAgentId).toBeDefined();

    // 2) GET /agents/:id to see the full structure
    const getRes = await request(app.getHttpServer())
      .get(`/agents/${templateAgentId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    const templateAgent = getRes.body;
    // Root checks
    expect(templateAgent.name).toBe('MainAgent');
    expect(templateAgent.tools).toHaveLength(1);
    expect(templateAgent.tools[0].name).toBe('TextParserTool');

    // Should have 2 direct children
    expect(templateAgent.children).toHaveLength(2);

    // Find SubAgent1
    const subAgent1 = templateAgent.children.find(
      (child: any) => child.name === 'SubAgent1',
    );
    expect(subAgent1).toBeDefined();
    expect(subAgent1.tools).toHaveLength(1);
    expect(subAgent1.tools[0].name).toBe('TextParserTool');
    // SubAgent1 should have exactly 1 child: SubAgent1_Child
    expect(subAgent1.children).toHaveLength(1);
    expect(subAgent1.children[0].name).toBe('SubAgent1_Child');

    // Find SubAgent2
    const subAgent2 = templateAgent.children.find(
      (child: any) => child.name === 'SubAgent2',
    );
    expect(subAgent2).toBeDefined();
    // No tools, no children for SubAgent2 in your template
    expect(subAgent2.tools).toHaveLength(0);
    expect(subAgent2.children).toHaveLength(0);
  });
});
