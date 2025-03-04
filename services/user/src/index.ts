import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeGrpcServer } from './services/grpcServer';
import userRoutes from './routes/userRoutes';
import { authMiddleware } from './middleware/authMiddleware';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api/users', authMiddleware, userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start the REST server
app.listen(port, () => {
  console.log(`User service REST server running on port ${port}`);
});

// Start the gRPC server
initializeGrpcServer();
