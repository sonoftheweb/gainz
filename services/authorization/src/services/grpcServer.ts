import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
const GRPC_PORT = process.env.GRPC_PORT || 5002;

export const initializeGrpcServer = () => {
  const packageDefinition = protoLoader.loadSync(
    path.resolve(__dirname, '../proto/authorization.proto'),
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
  const authProto: any = protoDescriptor.authorization;

  const server = new grpc.Server();

  // Register authorization service
  server.addService(authProto.AuthorizationService.service, {
    getUserByToken: getUserByToken,
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
      console.log(`Authorization gRPC server running on port ${port}`);
    }
  );
};

// gRPC method to get user by token
const getUserByToken = async (call: any, callback: any) => {
  try {
    const { token } = call.request;

    if (!token) {
      return callback(null, {
        success: false,
        error: 'Token is required',
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
        return callback(null, {
          success: false,
          error: 'User not found',
        });
      }

      // Return user info (excluding sensitive data)
      const { refreshToken, ...userInfo } = user;
      
      callback(null, {
        success: true,
        user: {
          id: userInfo.id,
          email: userInfo.email,
          createdAt: userInfo.createdAt.toISOString(),
          updatedAt: userInfo.updatedAt.toISOString()
        },
      });
    } catch (error) {
      return callback(null, {
        success: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    console.error('gRPC getUserByToken error:', error);
    callback(null, {
      success: false,
      error: 'Internal server error',
    });
  }
};
