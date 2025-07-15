// test/app-test-setup.ts (or .e2e-spec.ts)
import 'tsconfig-paths/register';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

let app: INestApplication;
let dataSource: DataSource;

beforeAll(async () => {
  console.log('Starting app');
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();
  await app.init();
  console.log('App initialized');

  // If you have a TypeORM DataSource you want to reuse/close
  dataSource = moduleFixture.get(DataSource);
  // optionally: await dataSource.runMigrations();
});

afterAll(async () => {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }

  if (app) {
    await app.close();
  }
});

/**
 * Provides a reference to the Nest app for other test files.
 */
export function getApp(): INestApplication {
  return app;
}
