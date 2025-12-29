import { Kafka, Producer, Consumer, logLevel, CompressionTypes } from 'kafkajs';
import { config } from '../config';
import { logger } from './logger';

// Standard Kafka configuration (works with Confluent Cloud)
const kafka = new Kafka({
  clientId: 'drone-mission-backend',
  brokers: config.kafka.brokers,
  ssl: true,
  sasl: config.kafka.apiKey ? {
    mechanism: 'plain',
    username: config.kafka.apiKey,
    password: config.kafka.apiSecret!,
  } : undefined,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

let producer: Producer | null = null;
let consumers: Map<string, Consumer> = new Map();

export async function initKafkaProducer(): Promise<Producer> {
  if (producer) return producer;
  
  try {
    producer = kafka.producer({
      allowAutoTopicCreation: true, // Allow for local development
      transactionTimeout: 30000,
    });
    
    await producer.connect();
    logger.info('Kafka producer connected');
    return producer;
  } catch (error) {
    logger.error('Failed to connect Kafka producer', { error });
    throw error;
  }
}

export async function getKafkaProducer(): Promise<Producer> {
  if (!producer) {
    return initKafkaProducer();
  }
  return producer;
}

export async function createKafkaConsumer(groupId: string): Promise<Consumer> {
  const existingConsumer = consumers.get(groupId);
  if (existingConsumer) return existingConsumer;
  
  const consumer = kafka.consumer({
    groupId,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
  });
  
  await consumer.connect();
  consumers.set(groupId, consumer);
  logger.info(`Kafka consumer connected: ${groupId}`);
  return consumer;
}

export async function publishToKafka(
  topic: string,
  messages: Array<{ key?: string; value: string; headers?: Record<string, string> }>
): Promise<void> {
  const prod = await getKafkaProducer();
  await prod.send({
    topic,
    compression: CompressionTypes.GZIP,
    messages: messages.map(m => ({
      key: m.key,
      value: m.value,
      headers: m.headers,
    })),
  });
}

export async function disconnectKafka(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
  for (const [groupId, consumer] of consumers) {
    await consumer.disconnect();
    logger.info(`Kafka consumer disconnected: ${groupId}`);
  }
  consumers.clear();
  logger.info('Kafka connections closed');
}

// Telemetry message schema
export interface TelemetryMessage {
  missionId: string;
  droneId: string;
  timestamp: string;
  position: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  velocity: {
    speed: number;
    heading: number;
  };
  battery: number;
  status: string;
  progress: number;
  signalStrength: number;
}

// Command message schema
export interface CommandMessage {
  commandId: string;
  missionId: string;
  droneId: string;
  action: 'START' | 'PAUSE' | 'RESUME' | 'ABORT' | 'RTH';
  timestamp: string;
  issuedBy: string;
}

// Event message schema
export interface MissionEventMessage {
  eventId: string;
  missionId: string;
  droneId: string;
  eventType: string;
  payload: Record<string, unknown>;
  timestamp: string;
}
