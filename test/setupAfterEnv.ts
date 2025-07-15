// test/setupAfterEnv.ts
import 'tsconfig-paths/register';
import * as dotenv from 'dotenv';
dotenv.config();

process.env.NODE_ENV = 'test';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * We'll store both user tokens and admin tokens in memory for tests.
 */
let app: INestApplication;
let dataSource: DataSource;
let userTokens: { accessToken: string; refreshToken: string } | null = null;
let adminTokens: { token: string } | null = null;

beforeAll(async () => {
  console.log('[setupAfterEnv] beforeAll: Creating Nest app');

  // 1. Create the Nest testing module.
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // 2. Initialize the application.
  app = moduleFixture.createNestApplication();
  await app.init();

  // 3. If using TypeORM, get a reference to your DataSource.
  dataSource = moduleFixture.get(DataSource);

  // 4. (Optional) create or ensure a test user exists:
  //    For example, we create a normal user with /auth/register or a custom route.
  // add random number to email
  const userEmail = `test@example-${Math.random()}.com`;
  const userPassword = 'test123';
  try {
    await request(app.getHttpServer())
      .post('/users')
      .send({ email: userEmail, password: userPassword, name: 'Test User' });

    console.log('[setupAfterEnv] beforeAll: User created');
  } catch (err) {
    console.warn('User may already exist or register failed:', err);
  }

  // 5. Log that user in to get normal user tokens
  const userLoginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: userEmail, password: userPassword })
    .expect(201);

  userTokens = userLoginResponse.body; // e.g. { accessToken, refreshToken }

  // 6. Create or ensure an admin user
  const adminPassword = process.env.ADMIN_TEST_PASSWORD || 'secure_password';
  // Your register endpoint or seeding logic must allow creating an admin.
  // Sometimes that's done by sending an extra field like "role: 'ADMIN'",
  // or you might have a dedicated admin-creation endpoint. Adjust as needed.

  // 7. Log in the admin user
  const adminLoginResponse = await request(app.getHttpServer())
    .post('/admin/login')
    .send({ password: adminPassword })
    .expect(201);

  adminTokens = adminLoginResponse.body; // e.g. { accessToken, refreshToken }

  console.log('[setupAfterEnv] beforeAll: App + user + admin ready');
});

afterAll(async () => {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
  if (app) {
    await app.close();
  }
  console.log('[setupAfterEnv] afterAll: App closed');
});

export function getApp(): INestApplication {
  if (!app) {
    throw new Error('App is not initialized yet!');
  }
  return app;
}

export function getUserTokens() {
  if (!userTokens) {
    throw new Error('User tokens are not available yet!');
  }
  return userTokens;
}

export function getAdminTokens() {
  if (!adminTokens) {
    throw new Error('Admin tokens are not available yet!');
  }
  return adminTokens;
}

export function getDataSource(): DataSource {
  if (!dataSource) {
    throw new Error('DataSource is not initialized yet!');
  }
  return dataSource;
}
