import express, { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from './config/db';
import { logger } from './utils/logger';

import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import ClubRoutes from "./routes/ClubRoutes";
import eventRoutes from "./routes/eventRoutes";

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

app.get("/", (req: Request, res: Response) => {
  res.send("UniNexus API is running...");
});

app.get("/api/health", (req: Request, res: Response) => {
  res.json({ 
    message: "Connected! Backend is running.",
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB first
    await connectDB();
    
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

startServer();
