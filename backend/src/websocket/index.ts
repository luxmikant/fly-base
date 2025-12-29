import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { config } from '../config';
import { RedisChannels } from '../lib/redis';
import { logger } from '../lib/logger';
import { recordWebSocketConnections } from '../lib/metrics';
import { AuthUser } from '../middleware/auth';

let io: Server | null = null;
let subClient: Redis | null = null;

export function initWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Redis subscriber for pub/sub
  subClient = new Redis(config.redis.url);

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const user = jwt.verify(token as string, config.jwt.secret) as AuthUser;
      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthUser;
    logger.info('WebSocket client connected', { userId: user.id, socketId: socket.id });
    
    updateConnectionCount();

    // Join organization room
    socket.join(`org:${user.orgId}`);

    // Subscribe to mission telemetry
    socket.on('subscribe:mission', async (missionId: string) => {
      const room = `mission:${missionId}`;
      socket.join(room);
      logger.debug('Client subscribed to mission', { socketId: socket.id, missionId });

      // Set up Redis subscription for this mission
      await setupMissionSubscription(missionId);
    });

    // Unsubscribe from mission telemetry
    socket.on('unsubscribe:mission', (missionId: string) => {
      socket.leave(`mission:${missionId}`);
      logger.debug('Client unsubscribed from mission', { socketId: socket.id, missionId });
    });

    // Subscribe to drone status
    socket.on('subscribe:drone', async (droneId: string) => {
      socket.join(`drone:${droneId}`);
      logger.debug('Client subscribed to drone', { socketId: socket.id, droneId });
    });

    // Subscribe to site alerts
    socket.on('subscribe:site', (siteId: string) => {
      socket.join(`site:${siteId}`);
      logger.debug('Client subscribed to site', { socketId: socket.id, siteId });
    });

    socket.on('disconnect', (reason) => {
      logger.info('WebSocket client disconnected', { userId: user.id, socketId: socket.id, reason });
      updateConnectionCount();
    });

    socket.on('error', (error) => {
      logger.error('WebSocket error', { socketId: socket.id, error });
    });
  });

  // Set up global Redis subscriptions
  setupGlobalSubscriptions();

  logger.info('WebSocket server initialized');
  return io;
}

async function setupMissionSubscription(missionId: string): Promise<void> {
  const channel = RedisChannels.missionTelemetry(missionId);
  
  // Check if already subscribed
  if (subClient?.listenerCount('message') === 0) {
    subClient.on('message', (ch, message) => {
      handleRedisMessage(ch, message);
    });
  }

  await subClient?.subscribe(channel);
}

function setupGlobalSubscriptions(): void {
  if (!subClient) return;

  subClient.on('message', (channel, message) => {
    handleRedisMessage(channel, message);
  });

  // Subscribe to system alerts
  subClient.subscribe(RedisChannels.alerts);
}

function handleRedisMessage(channel: string, message: string): void {
  if (!io) return;

  try {
    const data = JSON.parse(message);

    // Mission telemetry
    if (channel.startsWith('mission:') && channel.endsWith(':telemetry')) {
      const missionId = channel.split(':')[1];
      io.to(`mission:${missionId}`).emit('telemetry:update', data);
    }

    // Drone status
    if (channel.startsWith('drone:') && channel.endsWith(':status')) {
      const droneId = channel.split(':')[1];
      io.to(`drone:${droneId}`).emit('drone:status', data);
    }

    // System alerts
    if (channel === RedisChannels.alerts) {
      io.emit('alert', data);
    }
  } catch (error) {
    logger.error('Failed to handle Redis message', { channel, error });
  }
}

function updateConnectionCount(): void {
  if (io) {
    const count = io.sockets.sockets.size;
    recordWebSocketConnections(count);
  }
}

// Broadcast to specific mission subscribers
export function broadcastToMission(missionId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`mission:${missionId}`).emit(event, data);
  }
}

// Broadcast to organization
export function broadcastToOrg(orgId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`org:${orgId}`).emit(event, data);
  }
}

// Broadcast to site
export function broadcastToSite(siteId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`site:${siteId}`).emit(event, data);
  }
}

export async function closeWebSocket(): Promise<void> {
  if (subClient) {
    await subClient.quit();
    subClient = null;
  }
  if (io) {
    io.close();
    io = null;
  }
  logger.info('WebSocket server closed');
}
