import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeGrpcServer } from './services/grpcServer';
import authorizationRoutes from './routes/authorizationRoutes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3002;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/authorize', authorizationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start the REST server
app.listen(port, () => {
  console.log(`Authorization service REST server running on port ${port}`);
});

// Start the gRPC server
initializeGrpcServer();
