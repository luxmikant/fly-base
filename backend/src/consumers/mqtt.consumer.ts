import { connectMqtt, getMqttClient, subscribeMqtt, MqttTopics } from '../lib/mqtt';
import { publishToKafka, TelemetryMessage } from '../lib/kafka';
import { commandService } from '../services/command.service';
import { config } from '../config';
import { logger } from '../lib/logger';

export async function startMqttConsumer(): Promise<void> {
  const client = await connectMqtt();

  // Subscribe to all drone telemetry
  await subscribeMqtt(MqttTopics.allDronesTelemetry, 1);
  
  // Subscribe to all drone acknowledgments
  await subscribeMqtt(MqttTopics.allDronesAck, 1);

  client.on('message', async (topic, payload) => {
    try {
      const message = JSON.parse(payload.toString());
      
      // Handle telemetry from drones
      if (topic.includes('/telemetry')) {
        const droneId = topic.split('/')[1];
        await handleDroneTelemetry(droneId, message);
      }
      
      // Handle command acknowledgments
      if (topic.includes('/ack')) {
        const droneId = topic.split('/')[1];
        await handleCommandAck(droneId, message);
      }
    } catch (error) {
      logger.error('Failed to process MQTT message', { topic, error });
    }
  });

  logger.info('MQTT consumer started');
}

async function handleDroneTelemetry(droneId: string, data: any): Promise<void> {
  const telemetry: TelemetryMessage = {
    missionId: data.mission_id,
    droneId,
    timestamp: data.timestamp || new Date().toISOString(),
    position: {
      latitude: data.lat,
      longitude: data.lon,
      altitude: data.alt,
    },
    velocity: {
      speed: data.speed,
      heading: data.heading,
    },
    battery: data.battery,
    status: data.status,
    progress: data.progress || 0,
    signalStrength: data.signal || 100,
  };

  // Forward to Kafka for processing
  await publishToKafka(config.kafka.topics.telemetry, [
    {
      key: droneId,
      value: JSON.stringify(telemetry),
      headers: {
        missionId: telemetry.missionId,
        source: 'mqtt',
      },
    },
  ]);

  logger.debug('Telemetry forwarded to Kafka', { droneId, missionId: telemetry.missionId });
}

async function handleCommandAck(droneId: string, data: any): Promise<void> {
  const { cmd_id, status } = data;
  
  if (cmd_id && status) {
    await commandService.processAck(droneId, cmd_id, status);
  }
}
