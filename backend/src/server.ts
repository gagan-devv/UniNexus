import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from './config/db';
import { connectRedis, disconnectRedis, checkRedisHealth } from './config/redis';
import { initializeS3, getS3Client, getS3BucketName } from './config/s3';
import { getMediaService } from './services/mediaService';
import { logger } from './utils/logger';

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import ClubRoutes from "./routes/ClubRoutes";
import eventRoutes from "./routes/eventRoutes";
import rsvpRoutes from "./routes/rsvpRoutes";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

logger.info("🔍 Checking environment variables...");
logger.info(`PORT: ${PORT}`);
logger.info(`MONGO_URI exists: ${!!process.env.MONGO_URI}`);

app.use(cors());
app.use(express.json());

// Debug middleware to log all requests
app.use((req, res, next) => {
    logger.debug(`📨 ${req.method} ${req.path}`, { body: req.body });
    next();
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clubs", ClubRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/rsvp", rsvpRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("UniNexus API is running...");
});

app.get("/api/health", async (req: Request, res: Response) => {
  const redisHealthy = await checkRedisHealth();
  const s3Client = getS3Client();
  const s3Configured = s3Client !== null;
  
  res.json({ 
    message: "Connected! Backend is running.",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisHealthy ? 'connected' : 'disconnected',
    s3: s3Configured ? 'configured' : 'not configured'
  });
});

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Connect to Redis (non-blocking - app continues if Redis fails)
    await connectRedis();
    
    // Initialize S3 (non-blocking - app continues if S3 fails)
    const s3Client = initializeS3();
    const bucketName = getS3BucketName();
    
    // Initialize MediaService
    getMediaService(s3Client, bucketName);
    
    // Then start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error instanceof Error ? error : String(error));
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('⚠️ SIGINT received, shutting down gracefully...');
  await disconnectRedis();
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('⚠️ SIGTERM received, shutting down gracefully...');
  await disconnectRedis();
  await mongoose.connection.close();
  process.exit(0);
});

startServer();
