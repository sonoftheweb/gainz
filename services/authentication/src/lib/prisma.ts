// Direct import of Prisma client through Node.js import
import { PrismaClient } from "@prisma/client";

// Create a single instance of Prisma client to be used throughout the application
const prisma = new PrismaClient();

// Export the instance
export default prisma;
