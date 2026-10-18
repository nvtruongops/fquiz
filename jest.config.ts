import type { Config } from 'jest'

const sharedConfig: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@fquiz/database$': '<rootDir>/packages/database/src/index.ts',
    '^@fquiz/database/(.*)$': '<rootDir>/packages/database/src/$1',
    '^@fquiz/models$': '<rootDir>/packages/models/src/index.ts',
    '^@fquiz/models/(.*)$': '<rootDir>/packages/models/src/$1',
    '^@fquiz/auth$': '<rootDir>/packages/auth/src/index.ts',
    '^@fquiz/auth/(.*)$': '<rootDir>/packages/auth/src/$1',
    '^@fquiz/ui$': '<rootDir>/packages/ui/src/index.ts',
    '^@fquiz/ui/(.*)$': '<rootDir>/packages/ui/src/$1',
    '^@fquiz/config-typescript/(.*)$': '<rootDir>/packages/config-typescript/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
    '^.+\\.js$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        allowJs: true,
      },
    }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/.kilo/', '/.codeql-db/'],
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/.kilo/',
    '<rootDir>/.codeql-db/',
    '<rootDir>/test-results/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.codeql-db', '<rootDir>/.next'],
  transformIgnorePatterns: [
    '/node_modules/(?!(jose)/)',
  ],
}

const config: Config = {
  projects: [
    {
      ...sharedConfig,
      displayName: 'web',
      testMatch: ['<rootDir>/apps/web/**/*.test.ts', '<rootDir>/apps/web/**/*.test.tsx'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/apps/web/$1', ...sharedConfig.moduleNameMapper },
    },
    {
      ...sharedConfig,
      displayName: 'admin',
      testMatch: ['<rootDir>/apps/admin/**/*.test.ts', '<rootDir>/apps/admin/**/*.test.tsx'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/apps/admin/$1', ...sharedConfig.moduleNameMapper },
    },
    {
      ...sharedConfig,
      displayName: 'shared',
      testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.test.tsx'],
      testPathIgnorePatterns: [...sharedConfig.testPathIgnorePatterns!, '<rootDir>/apps/web/', '<rootDir>/apps/admin/'],
      moduleNameMapper: { '^@/(.*)$': '<rootDir>/apps/web/$1', ...sharedConfig.moduleNameMapper },
    },
  ],
  reporters: ['default'],
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 2,
      functions: 4,
      lines: 5,
      statements: 5,
    },
  },
  // Collect coverage from all source directories
  collectCoverageFrom: [
    'apps/web/app/**/*.{ts,tsx}',
    'apps/web/components/**/*.{ts,tsx}',
    'apps/web/hooks/**/*.{ts,tsx}',
    'apps/web/lib/**/*.{ts,tsx}',
    'apps/web/store/**/*.{ts,tsx}',
    'packages/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx}',
    '!**/models/**',
    '!**/schemas/**',
    '!**/constants/**',
    '!**/quiz-import/**',
  ],
}

export default config
