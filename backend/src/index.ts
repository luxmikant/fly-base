// Initialize Datadog APM (must be first)
import tracer from 'dd-trace';
tracer.init({
  service: process.env.DD_SERVICE || 'drone-mission-backend',
  env: process.env.DD_ENV || 'development',
  logInjection: true,
});

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './lib/logger';
import { connectDatabase, disconnectDatabase } from './lib/database';
import { connectRedis, disconnectRedis } from './lib/redis';
import { initKafkaProducer, disconnectKafka } from './lib/kafka';
import { initWebSocket, closeWebSocket } from './websocket';
import { startTelemetryConsumer } from './consumers/telemetry.consumer';
import { startMqttConsumer } from './consumers/mqtt.consumer';
import { recordApiRequest } from './lib/metrics';
import RealtimeAnalyticsProcessor from './processors/realtime-analytics.processor';
import WebSocketService from './services/websocket.service';

// Routes
import missionRoutes from './routes/mission.routes';
import droneRoutes from './routes/drone.routes';
import analyticsRoutes from './routes/analytics.routes';

const app = express();
const httpServer = createServer(app);

// Global services
let realtimeProcessor: RealtimeAnalyticsProcessor | null = null;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Rate limiting
app.use(rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Request logging and metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    recordApiRequest(req.method, req.path, res.statusCode, duration);
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });
  });
  
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/v1/missions', missionRoutes);
app.use('/api/v1/drones', droneRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('Shutting down...');
  
  if (realtimeProcessor) {
    await realtimeProcessor.stop();
  }
  
  await closeWebSocket();
  await disconnectKafka();
  await disconnectRedis();
  await disconnectDatabase();
  
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start(): Promise<void> {
  try {
    // Connect to databases
    await connectDatabase();
    await connectRedis();
    
    // Initialize Kafka producer
    await initKafkaProducer();
    
    // Initialize WebSocket
    const io = initWebSocket(httpServer);
    const wsService = new WebSocketService(io);
    
    // Initialize real-time analytics processor
    realtimeProcessor = new RealtimeAnalyticsProcessor(wsService);
    await realtimeProcessor.start();
    
    // Start consumers
    await startMqttConsumer();
    await startTelemetryConsumer();
    
    // Start HTTP server
    httpServer.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port}`);
      logger.info(`Environment: ${config.server.env}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();
