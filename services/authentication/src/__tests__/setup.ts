// Global test setup
import dotenv from 'dotenv';

// Load environment variables from .env.test if it exists, otherwise from .env
dotenv.config({ path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env' });

// Mock implementations or global test utilities can be added here
beforeAll(() => {
  // Setup that runs before all tests
});

afterAll(() => {
  // Cleanup that runs after all tests
});

// This disables console.log outputs during tests to keep the output clean
// but preserves error logging for debugging test failures
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  // Preserve error and warn for debugging tests
  error: console.error,
  warn: console.warn,
};
