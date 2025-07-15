import type { Config } from '@jest/types';
console.log('Setting up env');
import 'dotenv/config';

const config: Config.InitialOptions = {
  preset: 'ts-jest',

  // Since your original config used "../" as rootDir, adjust as needed.
  // Typically, you'd keep `rootDir` at the project root if this file is in root.
  rootDir: '../',
  //setupFiles: ['<rootDir>/test/setup-env.ts'],

  // Instead of "testRegex", you can use "testMatch" (recommended in newer docs).
  // This pattern matches files ending in .e2e-spec.ts
  testMatch: ['**/*.e2e-spec.ts'],

  // Use ts-jest for transforming TypeScript and JavaScript files
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },

  workerIdleMemoryLimit: '500MB',

  testTimeout: 60_000,

  // Node environment (e.g., for Express/NestJS tests, etc.)
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setupAfterEnv.ts'],

  // Global setup/teardown scripts

  // Map module aliases to their corresponding paths
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@agents/(.*)$': '<rootDir>/src/api/agent/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@auth/(.*)$': '<rootDir>/src/api/auth/$1',
    '^@user/(.*)$': '<rootDir>/src/api/user/$1',
    '^@knowledge/(.*)$': '<rootDir>/src/api/knowledge/$1',
    '^@tools/(.*)$': '<rootDir>/src/api/tool/$1',
    '^@models/(.*)$': '<rootDir>/src/api/models/$1',
    '^@admin/(.*)$': '<rootDir>/src/api/admin/$1',
    '^@steps/(.*)$': '<rootDir>/src/api/steps/$1',
    '^@test/(.*)$': '<rootDir>/test/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
  },

  // Extensions Jest will look for, in order
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],

  // Ignore tests in these paths
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],

  // Show individual test results
  verbose: true,
  modulePaths: ['<rootDir>'],
};

export default config;
