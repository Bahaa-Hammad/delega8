// test/api/tools/tools-crud-invoke.e2e-spec.ts

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getApp, getUserTokens } from '../../setupAfterEnv';
import { LlmProviders } from '@src/common/llm/enums';

describe('Tools CRUD & Invoke (E2E)', () => {
  let app: INestApplication;
  let userAccessToken: string;

  let createdToolId: string;

  beforeAll(() => {
    // Retrieve the Nest application from your global setup
    app = getApp();

    // Normal user token
    const { accessToken } = getUserTokens();
    userAccessToken = accessToken;

    // Increase test timeout if necessary
    jest.setTimeout(30000);
  });

  it('1) Create a new tool', async () => {
    const createPayload = {
      name: 'SampleTool',
      description: 'A tool for testing CRUD & invocation',
      fields: [
        {
          type: 'string',
          name: 'someInput',
          description: 'An input for the tool',
        },
      ],
      steps: [
        {
          type: 'llm',
          name: 'test-llm-step',
          promptTemplate: 'Hello from the test tool {someInput}',
          outputNamespace: 'testOutput',
          model: {
            provider: LlmProviders.OPENAI,
            name: 'gpt-3.5-turbo',
            temperature: 0.7,
          },
        },
      ],
    };

    const createRes = await request(app.getHttpServer())
      .post('/tools')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(createPayload)
      .expect(201);

    // Check the created tool
    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.name).toBe(createPayload.name);
    expect(createRes.body.description).toBe(createPayload.description);

    createdToolId = createRes.body.id;
  });

  it('2) Update the tool', async () => {
    const updatePayload = {
      description: 'Updated Description for the sample tool',
    };

    const updateRes = await request(app.getHttpServer())
      .patch(`/tools/${createdToolId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(updatePayload)
      .expect(200);

    expect(updateRes.body.id).toBe(createdToolId);
    expect(updateRes.body.description).toBe(updatePayload.description);
  });

  it('3) Invoke the tool once', async () => {
    const invokePayload = {
      someInput: 'Hello, single invocation!',
    };

    const invokeRes = await request(app.getHttpServer())
      .post(`/tools/${createdToolId}/invoke`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(invokePayload)
      .expect(201); // or 200, depending on your implementation

    // If the step succeeded, we either get the final context,
    // or a structure like { status: 'success', ... } if your code does that
    // Adjust checks as needed:
    expect(invokeRes.body).toBeDefined();
    // if the result is an LLM reply, for example:
    // expect(typeof invokeRes.body).toBe('string');
  });

  it('4) Bulk-invoke the tool', async () => {
    const bulkPayload = [
      { someInput: 'Bulk #1' },
      { someInput: 'Bulk #2' },
      { someInput: 'Bulk #3' },
    ];

    const bulkRes = await request(app.getHttpServer())
      .post(`/tools/${createdToolId}/bulk-invoke`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(bulkPayload)
      .expect(201); // or 200

    // This endpoint presumably returns an array of results
    expect(Array.isArray(bulkRes.body)).toBe(true);
    // We expect 3 results
    expect(bulkRes.body.length).toBe(3);

    // If each result is either an LLM answer or { status, error }
    // you can do deeper checks
  });

  it('5) List all user tools', async () => {
    const listRes = await request(app.getHttpServer())
      .get('/tools')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    // The createdToolId should be in the list
    const found = listRes.body.find((t: any) => t.id === createdToolId);
    expect(found).toBeDefined();
  });

  it('6) Get the tool by ID', async () => {
    const getRes = await request(app.getHttpServer())
      .get(`/tools/${createdToolId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    expect(getRes.body.id).toBe(createdToolId);
  });

  it('7) Delete the tool', async () => {
    await request(app.getHttpServer())
      .delete(`/tools/${createdToolId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    // Double check it’s gone
    await request(app.getHttpServer())
      .get(`/tools/${createdToolId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(404);
  });
});
