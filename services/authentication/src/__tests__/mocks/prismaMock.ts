import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Create a deep mock of PrismaClient
export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Mock the Prisma client module
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: prismaMock,
}));

// Reset mocks between tests
beforeEach(() => {
  mockReset(prismaMock);
});
