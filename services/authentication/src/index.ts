import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeGrpcServer } from './services/grpcServer';
import authRoutes from './routes/authRoutes';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start the REST server
app.listen(port, () => {
  console.log(`Authentication service REST server running on port ${port}`);
});

// Start the gRPC server
initializeGrpcServer();
