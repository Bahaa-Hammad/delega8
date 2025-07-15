import 'tsconfig-paths/register';
import { Test, TestingModule } from '@nestjs/testing';

import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

let app: INestApplication;
let dataSource: DataSource;

// 1) Spin up the Nest app once before all tests that import this file
beforeAll(async () => {
  console.log('Starting app');
  // Create the testing module with your app's root module
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // Create Nest application
  app = moduleFixture.createNestApplication();
  await app.init();
  console.log('App initialized');
  // If you have a TypeORM DataSource you want to reuse or close later:
  // dataSource = moduleFixture.get(DataSource);
  // optionally: await dataSource.runMigrations();

  // The app is now ready for all test files.
});

// 2) After all tests have run, close the app (and DB connection if needed)
afterAll(async () => {
  // If using TypeORM 0.3+, close the DataSource instead of getConnection()
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }

  if (app) {
    await app.close();
  }
});

/**
 * Provides a reference to the Nest app for other test files.
 * Must be called AFTER the 'beforeAll' in this file has run.
 */
export function getApp(): INestApplication {
  return app;
}
