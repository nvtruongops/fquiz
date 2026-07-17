import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
    '^.+\.js$': ['ts-jest', {
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
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/.kilo/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(jose)/)',
  ],
  // SonarQube test execution reporter (generic format)
  reporters: [
    'default',
    ['jest-sonar', {
      outputDirectory: 'test-results',
      outputName: 'sonar-report.xml',
    }],
  ],
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
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'store/**/*.{ts,tsx}',
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