import Redis from 'ioredis';
import { config } from '../config';
import { logger } from './logger';

export const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
  lazyConnect: true,
});

redis.on('connect', () => logger.info('Connected to Redis'));
redis.on('error', (err) => logger.error('Redis error', err));
redis.on('close', () => logger.warn('Redis connection closed'));

// Redis key patterns
export const RedisKeys = {
  missionState: (missionId: string) => `mission:${missionId}:state`,
  missionLatestTelemetry: (missionId: string) => `mission:${missionId}:latest`,
  droneLive: 'drones:live',
  droneLocation: (droneId: string) => `drone:${droneId}:location`,
  siteFleetStatus: (siteId: string) => `site:${siteId}:fleet_status`,
  pendingCommand: (cmdId: string) => `command:${cmdId}:pending`,
  commandAck: (cmdId: string) => `command:${cmdId}:ack`,
  userSession: (userId: string) => `user:${userId}:session`,
};

// Pub/Sub channels
export const RedisChannels = {
  missionTelemetry: (missionId: string) => `mission:${missionId}:telemetry`,
  droneStatus: (droneId: string) => `drone:${droneId}:status`,
  alerts: 'system:alerts',
};

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('Disconnected from Redis');
}
