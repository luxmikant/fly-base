import StatsD from 'hot-shots';
import { config } from '../config';
import { logger } from './logger';

// Datadog StatsD client for custom metrics
export const metrics = new StatsD({
  host: 'localhost', // Datadog agent host
  port: 8125,
  prefix: 'drone_mission.',
  globalTags: {
    env: config.datadog.env,
    service: config.datadog.service,
  },
  errorHandler: (error) => {
    logger.error('StatsD error', error);
  },
});

// Custom metric helpers
export const MetricNames = {
  // Telemetry metrics
  telemetryReceived: 'telemetry.received',
  telemetryLatency: 'telemetry.latency',
  telemetryProcessed: 'telemetry.processed',
  
  // Mission metrics
  missionCreated: 'mission.created',
  missionStarted: 'mission.started',
  missionCompleted: 'mission.completed',
  missionAborted: 'mission.aborted',
  missionFailed: 'mission.failed',
  missionDuration: 'mission.duration',
  
  // Drone metrics
  droneOnline: 'drone.online',
  droneOffline: 'drone.offline',
  droneBatteryLow: 'drone.battery_low',
  droneCommandSent: 'drone.command_sent',
  droneCommandAck: 'drone.command_ack',
  droneCommandTimeout: 'drone.command_timeout',
  
  // API metrics
  apiRequestDuration: 'api.request_duration',
  apiRequestCount: 'api.request_count',
  apiErrorCount: 'api.error_count',
  
  // WebSocket metrics
  wsConnectionsActive: 'websocket.connections_active',
  wsMessagesOut: 'websocket.messages_out',
  
  // Kafka metrics
  kafkaMessagesProduced: 'kafka.messages_produced',
  kafkaMessagesConsumed: 'kafka.messages_consumed',
  kafkaConsumerLag: 'kafka.consumer_lag',
};

// Metric recording helpers
export function recordTelemetryReceived(droneId: string, missionId: string): void {
  metrics.increment(MetricNames.telemetryReceived, { drone_id: droneId, mission_id: missionId });
}

export function recordTelemetryLatency(latencyMs: number, droneId: string): void {
  metrics.histogram(MetricNames.telemetryLatency, latencyMs, { drone_id: droneId });
}

export function recordMissionEvent(event: string, missionId: string, siteId: string): void {
  metrics.increment(`mission.${event}`, { mission_id: missionId, site_id: siteId });
}

export function recordApiRequest(method: string, path: string, statusCode: number, durationMs: number): void {
  metrics.histogram(MetricNames.apiRequestDuration, durationMs, { method, path, status: String(statusCode) });
  metrics.increment(MetricNames.apiRequestCount, { method, path, status: String(statusCode) });
}

export function recordWebSocketConnections(count: number): void {
  metrics.gauge(MetricNames.wsConnectionsActive, count);
}

export function recordKafkaMessage(topic: string, type: 'produced' | 'consumed'): void {
  const metric = type === 'produced' ? MetricNames.kafkaMessagesProduced : MetricNames.kafkaMessagesConsumed;
  metrics.increment(metric, { topic });
}
