import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const AUTHORIZATION_GRPC_URL = process.env.AUTHORIZATION_GRPC_URL || 'authorization:5002';

// Load authorization proto file
const packageDefinition = protoLoader.loadSync(
  path.resolve(__dirname, './protos/authorization.proto'),
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  }
);

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

// Use proper type casting
const authProto: any = protoDescriptor.authorization;

let client: any = null;

export const getAuthClient = () => {
  if (!client) {
    client = new authProto.AuthorizationService(
      AUTHORIZATION_GRPC_URL,
      grpc.credentials.createInsecure()
    );
  }
  return client;
};
