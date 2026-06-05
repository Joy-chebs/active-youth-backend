import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^../../../config/prisma$': '<rootDir>/tests/__mocks__/prisma.ts',
    '^../../config/prisma$': '<rootDir>/tests/__mocks__/prisma.ts',
    '^.*/config/prisma$': '<rootDir>/tests/__mocks__/prisma.ts',
    '^../../../events/publishers/(.*)$': '<rootDir>/tests/__mocks__/publishers.ts',
    '^../../events/publishers/(.*)$': '<rootDir>/tests/__mocks__/publishers.ts',
    '^.*/events/publishers/(.*)$': '<rootDir>/tests/__mocks__/publishers.ts',
    '^../../../utils/cloudinary$': '<rootDir>/tests/__mocks__/cloudinary.ts',
    '^../../utils/cloudinary$': '<rootDir>/tests/__mocks__/cloudinary.ts',
    '^.*/utils/cloudinary$': '<rootDir>/tests/__mocks__/cloudinary.ts',
    '^.*generated/prisma/client$': '<rootDir>/tests/__mocks__/prismaClient.ts',
    '^@prisma/client/runtime/library$': '<rootDir>/tests/__mocks__/prismaRuntime.ts',
    '^@prisma/adapter-pg$': '<rootDir>/tests/__mocks__/prismaRuntime.ts',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/config/prisma.ts',
    '!src/config/env.ts',
    '!src/**/*.routes.ts',
    '!src/events/**/*.ts',
    '!src/utils/cloudinary.ts',
    '!src/middlewares/upload.ts',
    '!src/middlewares/errorHandler.ts',
  ],
  coverageThreshold: {
    global: { lines: 80, functions: 80, branches: 70, statements: 80 },
  },
  coverageReporters: ['text', 'lcov', 'html'],
};

export default config;
