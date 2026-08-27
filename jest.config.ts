import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/apps/web/$1',
    '^@fquiz/database$': '<rootDir>/packages/database/src/index.ts',
    '^@fquiz/models$': '<rootDir>/packages/models/src/index.ts',
    '^@fquiz/auth$': '<rootDir>/packages/auth/src/index.ts',
    '^@fquiz/ui$': '<rootDir>/packages/ui/src/index.ts',
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
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],
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