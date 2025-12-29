import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { config } from '../config';
import { logger } from './logger';

let client: MqttClient | null = null;

// MQTT Topics
export const MqttTopics = {
  droneTelemetry: (droneId: string) => `drones/${droneId}/telemetry`,
  droneCommands: (droneId: string) => `drones/${droneId}/commands`,
  droneAck: (droneId: string) => `drones/${droneId}/ack`,
  droneStatus: (droneId: string) => `drones/${droneId}/status`,
  allDronesTelemetry: 'drones/+/telemetry',
  allDronesAck: 'drones/+/ack',
};

export async function connectMqtt(): Promise<MqttClient> {
  if (client) return client;

  const options: IClientOptions = {
    clientId: `drone-backend-${Date.now()}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    username: config.mqtt.username,
    password: config.mqtt.password,
  };

  return new Promise((resolve, reject) => {
    client = mqtt.connect(config.mqtt.brokerUrl, options);

    client.on('connect', () => {
      logger.info('Connected to MQTT broker');
      resolve(client!);
    });

    client.on('error', (err) => {
      logger.error('MQTT connection error', err);
      reject(err);
    });

    client.on('reconnect', () => {
      logger.warn('MQTT reconnecting...');
    });

    client.on('close', () => {
      logger.warn('MQTT connection closed');
    });
  });
}

export function getMqttClient(): MqttClient | null {
  return client;
}

export async function publishMqtt(
  topic: string,
  message: string | Buffer,
  qos: 0 | 1 | 2 = 1
): Promise<void> {
  if (!client) {
    throw new Error('MQTT client not connected');
  }

  return new Promise((resolve, reject) => {
    client!.publish(topic, message, { qos }, (err) => {
      if (err) {
        logger.error('MQTT publish error', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function subscribeMqtt(
  topic: string,
  qos: 0 | 1 | 2 = 1
): Promise<void> {
  if (!client) {
    throw new Error('MQTT client not connected');
  }

  return new Promise((resolve, reject) => {
    client!.subscribe(topic, { qos }, (err) => {
      if (err) {
        logger.error('MQTT subscribe error', err);
        reject(err);
      } else {
        logger.info(`Subscribed to MQTT topic: ${topic}`);
        resolve();
      }
    });
  });
}

export async function disconnectMqtt(): Promise<void> {
  if (client) {
    await new Promise<void>((resolve) => {
      client!.end(false, {}, () => {
        logger.info('Disconnected from MQTT broker');
        resolve();
      });
    });
    client = null;
  }
}
