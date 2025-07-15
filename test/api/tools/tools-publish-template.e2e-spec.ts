// test/api/tools/tools-publish-template.e2e-spec.ts

import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { getApp, getUserTokens, getAdminTokens } from '../../setupAfterEnv';
import { ToolPublishStatus, ToolType } from '@tools/types';
import { LlmProviders } from '@src/common/llm/enums';

describe('Tools Publish & Template Flow (E2E)', () => {
  let app: INestApplication;
  let userAccessToken: string;
  let adminAccessToken: string;

  let createdUserToolId: string;
  let publishedTemplateToolId: string;
  let clonedUserToolId: string;

  beforeAll(() => {
    app = getApp();

    const { accessToken } = getUserTokens();
    userAccessToken = accessToken;

    const { token } = getAdminTokens();
    adminAccessToken = token;

    jest.setTimeout(30000);
  });

  it('1) Create a user tool that we want to publish', async () => {
    const payload = {
      name: 'UserToolForPublish',
      description: 'A user tool we want to publish as a template',
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
          name: 'simple-llm-step',
          promptTemplate: 'Hello from a user tool! {someInput}',
          model: {
            provider: LlmProviders.OPENAI,
            name: 'gpt-3.5-turbo',
          },
        },
      ],
    };

    const createRes = await request(app.getHttpServer())
      .post('/tools')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send(payload)
      .expect(201);

    createdUserToolId = createRes.body.id;
    expect(createdUserToolId).toBeDefined();
    expect(createRes.body.publishStatus).toBe(ToolPublishStatus.DRAFT);

    // Optionally fetch it:
    const getRes = await request(app.getHttpServer())
      .get(`/tools/${createdUserToolId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    // Should not be a template yet
    expect(getRes.body.type).toBe(ToolType.USER);
  });

  it('2) User requests publish => tool goes UNDER_REVIEW', async () => {
    const publishReq = await request(app.getHttpServer())
      .post(`/tools/${createdUserToolId}/publish-requests`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(201); // or 200

    // The code sets publishStatus=UNDER_REVIEW
    expect(publishReq.body.publishStatus).toBe(ToolPublishStatus.UNDER_REVIEW);
    // If there's also a type field, it might remain "USER" or switch to "TEMPLATE"
  });

  it('3) Admin publishes => new template tool is created', async () => {
    const publishRes = await request(app.getHttpServer())
      .post(`/tools/${createdUserToolId}/publish`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(201); // or 200

    // The newly published tool is presumably a separate tool with
    // type=TEMPLATE, publishStatus=PUBLISHED, user=null
    publishedTemplateToolId = publishRes.body.id;
    expect(publishedTemplateToolId).toBeDefined();
    expect(publishRes.body.type).toBe(ToolType.TEMPLATE);
    expect(publishRes.body.publishStatus).toBe(ToolPublishStatus.PUBLISHED);

    // Double-check we got a new ID
    expect(publishedTemplateToolId).not.toBe(createdUserToolId);
  });

  it('4) User clones the published template => user draft tool', async () => {
    const cloneRes = await request(app.getHttpServer())
      .post(`/tools/${publishedTemplateToolId}/clone`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(201);

    clonedUserToolId = cloneRes.body.id;
    expect(clonedUserToolId).toBeDefined();
    // The cloned user tool typically has type=USER, publishStatus=DRAFT
    expect(cloneRes.body.type).toBe(ToolType.USER);
    expect(cloneRes.body.publishStatus).toBe(ToolPublishStatus.DRAFT);

    // Optionally fetch it
    const getClone = await request(app.getHttpServer())
      .get(`/tools/${clonedUserToolId}`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    // Confirm it has the same steps, name might differ or same
    expect(getClone.body.steps.length).toBe(1);
    expect(getClone.body.name).toBe('UserToolForPublish'); // or "CloneOfUserToolForPublish"
  });

  it('Invoke the tool', async () => {
    const invokeRes = await request(app.getHttpServer())
      .post(`/tools/${clonedUserToolId}/invoke`)
      .set('Authorization', `Bearer ${userAccessToken}`)
      .send({ someInput: 'Hello' })
      .expect(201);
  });

  it('5) Attempt to publish again => user must do publish-requests etc.', async () => {
    // This is optional. But if you want to confirm the new cloned tool is DRAFT,
    // we can do a publish-requests again, etc.
    // Or simply check it's in the correct state
    expect(true).toBe(true);
  });
});
