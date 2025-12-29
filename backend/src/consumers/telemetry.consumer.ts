import { createKafkaConsumer, TelemetryMessage } from '../lib/kafka';
import { config } from '../config';
import { logger } from '../lib/logger';
import { telemetryService } from '../services/telemetry.service';
import { droneService } from '../services/drone.service';
import { missionService } from '../services/mission.service';
import { recordKafkaMessage } from '../lib/metrics';
import { MissionStatus } from '@prisma/client';

const CONSUMER_GROUP = 'telemetry-processor';

export async function startTelemetryConsumer(): Promise<void> {
  const consumer = await createKafkaConsumer(CONSUMER_GROUP);

  await consumer.subscribe({
    topic: config.kafka.topics.telemetry,
    fromBeginning: false,
  });

  await consumer.run({
    eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
      for (const message of batch.messages) {
        try {
          if (!message.value) continue;

          const telemetry: TelemetryMessage = JSON.parse(message.value.toString());
          
          // Process telemetry
          await telemetryService.processTelemetry(telemetry);

          // Update drone battery
          await droneService.updateDroneBattery(telemetry.droneId, telemetry.battery);

          // Check for mission completion
          if (telemetry.progress >= 100) {
            await missionService.completeMission(telemetry.missionId);
          }

          // Check for critical conditions
          await checkCriticalConditions(telemetry);

          recordKafkaMessage(config.kafka.topics.telemetry, 'consumed');
          resolveOffset(message.offset);
          await heartbeat();
        } catch (error) {
          logger.error('Failed to process telemetry message', { error, offset: message.offset });
        }
      }
    },
  });

  logger.info('Telemetry consumer started');
}

async function checkCriticalConditions(telemetry: TelemetryMessage): Promise<void> {
  // Low battery alert
  if (telemetry.battery < 15) {
    logger.warn('Critical battery level', {
      droneId: telemetry.droneId,
      missionId: telemetry.missionId,
      battery: telemetry.battery,
    });
    // Could trigger RTH command here
  }

  // Signal strength alert
  if (telemetry.signalStrength < 20) {
    logger.warn('Low signal strength', {
      droneId: telemetry.droneId,
      missionId: telemetry.missionId,
      signalStrength: telemetry.signalStrength,
    });
  }
}
