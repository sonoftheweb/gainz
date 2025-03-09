const emailServiceMock = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailVerificationOTP: jest.fn().mockResolvedValue(undefined)
};

export default emailServiceMock;
