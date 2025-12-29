import { redis, RedisKeys, RedisChannels } from '../lib/redis';
import { publishToKafka, TelemetryMessage } from '../lib/kafka';
import { config } from '../config';
import { logger } from '../lib/logger';
import { recordTelemetryReceived, recordTelemetryLatency, recordKafkaMessage } from '../lib/metrics';

export class TelemetryService {
  private static instance: TelemetryService;
  private telemetryBuffer: TelemetryMessage[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 1000;

  private constructor() {
    this.startFlushInterval();
  }

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, this.FLUSH_INTERVAL_MS);
  }

  async processTelemetry(telemetry: TelemetryMessage): Promise<void> {
    const receiveTime = Date.now();
    const messageTime = new Date(telemetry.timestamp).getTime();
    const latency = receiveTime - messageTime;

    // Record metrics
    recordTelemetryReceived(telemetry.droneId, telemetry.missionId);
    recordTelemetryLatency(latency, telemetry.droneId);

    // Update Redis cache (real-time state)
    await this.updateRedisState(telemetry);

    // Publish to Redis pub/sub for WebSocket broadcast
    await this.broadcastTelemetry(telemetry);

    // Buffer for Kafka batch write
    this.bufferTelemetry(telemetry);

    logger.debug('Telemetry processed', {
      droneId: telemetry.droneId,
      missionId: telemetry.missionId,
      latency,
    });
  }

  private async updateRedisState(telemetry: TelemetryMessage): Promise<void> {
    const pipeline = redis.pipeline();

    // Update mission latest telemetry
    pipeline.setex(
      RedisKeys.missionLatestTelemetry(telemetry.missionId),
      60,
      JSON.stringify(telemetry)
    );

    // Update mission state
    pipeline.hset(RedisKeys.missionState(telemetry.missionId), {
      status: telemetry.status,
      progress: telemetry.progress.toString(),
      battery: telemetry.battery.toString(),
      lastUpdate: telemetry.timestamp,
    });

    // Update drone location (geospatial)
    pipeline.geoadd(
      RedisKeys.droneLive,
      telemetry.position.longitude,
      telemetry.position.latitude,
      telemetry.droneId
    );

    // Update individual drone location with full data
    pipeline.setex(
      RedisKeys.droneLocation(telemetry.droneId),
      30,
      JSON.stringify({
        ...telemetry.position,
        velocity: telemetry.velocity,
        battery: telemetry.battery,
        timestamp: telemetry.timestamp,
      })
    );

    await pipeline.exec();
  }

  private async broadcastTelemetry(telemetry: TelemetryMessage): Promise<void> {
    await redis.publish(
      RedisChannels.missionTelemetry(telemetry.missionId),
      JSON.stringify(telemetry)
    );
  }

  private bufferTelemetry(telemetry: TelemetryMessage): void {
    this.telemetryBuffer.push(telemetry);
    if (this.telemetryBuffer.length >= this.BUFFER_SIZE) {
      this.flushBuffer();
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.telemetryBuffer.length === 0) return;

    const messages = this.telemetryBuffer.splice(0, this.telemetryBuffer.length);
    
    try {
      await publishToKafka(
        config.kafka.topics.telemetry,
        messages.map(m => ({
          key: m.droneId,
          value: JSON.stringify(m),
          headers: {
            missionId: m.missionId,
            timestamp: m.timestamp,
          },
        }))
      );
      
      recordKafkaMessage(config.kafka.topics.telemetry, 'produced');
      logger.debug(`Flushed ${messages.length} telemetry messages to Kafka`);
    } catch (error) {
      logger.error('Failed to flush telemetry to Kafka', { error });
      // Re-add messages to buffer for retry
      this.telemetryBuffer.unshift(...messages);
    }
  }

  async getLatestTelemetry(missionId: string): Promise<TelemetryMessage | null> {
    const data = await redis.get(RedisKeys.missionLatestTelemetry(missionId));
    return data ? JSON.parse(data) : null;
  }

  async getMissionState(missionId: string): Promise<Record<string, string> | null> {
    const state = await redis.hgetall(RedisKeys.missionState(missionId));
    return Object.keys(state).length > 0 ? state : null;
  }

  async getDronesInRadius(
    latitude: number,
    longitude: number,
    radiusKm: number
  ): Promise<Array<{ droneId: string; distance: number }>> {
    const results = await redis.georadius(
      RedisKeys.droneLive,
      longitude,
      latitude,
      radiusKm,
      'km',
      'WITHDIST'
    );

    return results.map((r: any) => ({
      droneId: r[0],
      distance: parseFloat(r[1]),
    }));
  }

  async cleanup(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushBuffer();
  }
}

export const telemetryService = TelemetryService.getInstance();
