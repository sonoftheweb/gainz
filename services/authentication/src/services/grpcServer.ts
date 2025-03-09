import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
const GRPC_PORT = process.env.GRPC_PORT || 5001;

export const initializeGrpcServer = () => {
  const packageDefinition = protoLoader.loadSync(
    path.resolve(__dirname, '../proto/authentication.proto'),
    {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    }
  );

  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  
  // Access the service definition using proper type assertion
  const authProto: any = protoDescriptor.authentication;

  const server = new grpc.Server();

  // Register authentication service
  server.addService(authProto.AuthenticationService.service, {
    validateToken: validateToken,
  });

  // Start the gRPC server
  server.bindAsync(
    `0.0.0.0:${GRPC_PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
      if (error) {
        console.error('Failed to start gRPC server:', error);
        return;
      }
      console.log(`Authentication gRPC server running on port ${port}`);
    }
  );
};

// gRPC method to validate a token
const validateToken = async (call: any, callback: any) => {
  try {
    const { token } = call.request;

    if (!token) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Token is required',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string };
      
      // Find user by ID
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user) {
        return callback({
          code: grpc.status.NOT_FOUND,
          message: 'User not found',
        });
      }

      // Return user info (excluding password)
      const { password, ...userWithoutPassword } = user;
      
      callback(null, {
        valid: true,
        user: userWithoutPassword,
      });
    } catch (error) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    console.error('gRPC validateToken error:', error);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Internal server error',
    });
  }
};
