// Mock for the token service
const tokenServiceMock = {
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
  verifyToken: jest.fn(),
  revokeToken: jest.fn(),
  revokeAllUserTokens: jest.fn(),
};

// Mock the token service module
jest.mock('../../services/tokenService', () => ({
  __esModule: true,
  default: tokenServiceMock
}));

export default tokenServiceMock;
