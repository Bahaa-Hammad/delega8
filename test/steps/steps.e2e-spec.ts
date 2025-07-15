// test/steps/steps.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

import { StepsModule } from '@steps/module';
import { getUserTokens } from '../setupAfterEnv';

describe('StepsController (e2e)', () => {
  let app: INestApplication;
  let userAccessToken: string;

  beforeAll(async () => {
    // 1) Create testing module
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [StepsModule],
    }).compile();

    // 2) Create the Nest app from the module
    app = moduleRef.createNestApplication();
    await app.init();

    const { accessToken } = getUserTokens();
    userAccessToken = accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/steps (GET) should return a list of step types', async () => {
    const response = await request(app.getHttpServer())
      .get('/steps')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    // e.g. ensure 'api', 'llm', 'youtube' appear
    expect(response.body).toContain('api');
    expect(response.body).toContain('llm');
    expect(response.body).toContain('youtube');
  });

  it('/steps/schemas (GET) should return all steps as JSON schemas', async () => {
    const response = await request(app.getHttpServer())
      .get('/steps/schemas')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    console.log(JSON.stringify(response.body, null, 2));
    // The result should be an object keyed by step type,
    // and each step type is { input: { ...schema }, output: { ...schema } }
    expect(typeof response.body).toBe('object');
    // check the 'api' entry, for example:
    expect(response.body).toHaveProperty('api');
    // The input schema for 'api' should have a title of 'api'
    expect(response.body.api).toHaveProperty('input');
    expect(response.body.api.input).toHaveProperty('type', 'object');

    // The output schema for 'api'
    expect(response.body.api).toHaveProperty('output');
    // you can check the output title if you gave it a name
    // expect(response.body.api.output).toHaveProperty('title', 'api-output');
    expect(response.body.api.output).toHaveProperty('type', 'object');

    // Check for the other step types as well
    expect(response.body).toHaveProperty('llm');
    expect(response.body).toHaveProperty('youtube');
    expect(response.body).toHaveProperty('scrape');
    expect(response.body).toHaveProperty('brokenLinks');
  });

  it('/steps/schemas/:stepType (GET) should return a single step schema', async () => {
    const response = await request(app.getHttpServer())
      .get('/steps/schemas/api')
      .set('Authorization', `Bearer ${userAccessToken}`)
      .expect(200);

    // The service now returns:
    // {
    //   "inputScheme": { title: "api", type: "object", ... },
    //   "outputScheme": { title: "api-output", type: "object", ... }
    // }
    expect(response.body).toHaveProperty('inputScheme');
    expect(response.body.inputScheme).toHaveProperty('type', 'object');

    // For output
    expect(response.body).toHaveProperty('outputScheme');
    // If your code sets a title or not, check accordingly:
    // expect(response.body.outputScheme).toHaveProperty('title', 'api-output');
    expect(response.body.outputScheme).toHaveProperty('type', 'object');
  });
});
