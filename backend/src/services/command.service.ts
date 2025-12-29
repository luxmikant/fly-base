import { v4 as uuidv4 } from 'uuid';
import { redis, RedisKeys } from '../lib/redis';
import { publishMqtt, MqttTopics } from '../lib/mqtt';
import { publishToKafka, CommandMessage } from '../lib/kafka';
import { config } from '../config';
import { logger } from '../lib/logger';
import { metrics, MetricNames } from '../lib/metrics';
import { prisma } from '../lib/database';
import { MissionStatus } from '@prisma/client';

export interface CommandResult {
  success: boolean;
  commandId: string;
  message: string;
  acknowledgedAt?: string;
}

export class CommandService {
  private static instance: CommandService;
  private readonly COMMAND_TIMEOUT_MS = 30000;
  private readonly ACK_POLL_INTERVAL_MS = 500;

  private constructor() {}

  static getInstance(): CommandService {
    if (!CommandService.instance) {
      CommandService.instance = new CommandService();
    }
    return CommandService.instance;
  }

  async sendCommand(
    missionId: string,
    droneId: string,
    action: CommandMessage['action'],
    issuedBy: string
  ): Promise<CommandResult> {
    const commandId = uuidv4();
    const timestamp = new Date().toISOString();

    const command: CommandMessage = {
      commandId,
      missionId,
      droneId,
      action,
      timestamp,
      issuedBy,
    };

    // Store pending command in Redis
    await redis.setex(
      RedisKeys.pendingCommand(commandId),
      this.COMMAND_TIMEOUT_MS / 1000,
      JSON.stringify(command)
    );

    // Publish to MQTT with QoS 1 (at least once delivery)
    try {
      await publishMqtt(
        MqttTopics.droneCommands(droneId),
        JSON.stringify(command),
        1
      );
      
      metrics.increment(MetricNames.droneCommandSent, { action, drone_id: droneId });
      logger.info('Command sent to drone', { commandId, droneId, action });
    } catch (error) {
      logger.error('Failed to send command via MQTT', { error, commandId });
      throw new Error('Failed to send command to drone');
    }

    // Publish to Kafka for audit trail
    await publishToKafka(config.kafka.topics.commands, [
      {
        key: droneId,
        value: JSON.stringify(command),
        headers: { action, missionId },
      },
    ]);

    // Wait for acknowledgment
    const ackResult = await this.waitForAck(commandId, droneId, action);

    // Update mission status in database
    if (ackResult.success) {
      await this.updateMissionStatus(missionId, action);
    }

    return ackResult;
  }

  private async waitForAck(
    commandId: string,
    droneId: string,
    action: string
  ): Promise<CommandResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < this.COMMAND_TIMEOUT_MS) {
      const ack = await redis.get(RedisKeys.commandAck(commandId));
      
      if (ack) {
        const ackData = JSON.parse(ack);
        metrics.increment(MetricNames.droneCommandAck, { action, drone_id: droneId });
        
        return {
          success: true,
          commandId,
          message: 'Command acknowledged by drone',
          acknowledgedAt: ackData.timestamp,
        };
      }
      
      await this.sleep(this.ACK_POLL_INTERVAL_MS);
    }

    // Timeout - command not acknowledged
    metrics.increment(MetricNames.droneCommandTimeout, { action, drone_id: droneId });
    logger.warn('Command timeout', { commandId, droneId, action });

    return {
      success: false,
      commandId,
      message: `Command timeout: Drone ${droneId} did not acknowledge within ${this.COMMAND_TIMEOUT_MS / 1000}s`,
    };
  }

  async processAck(droneId: string, commandId: string, status: string): Promise<void> {
    const ackData = {
      droneId,
      commandId,
      status,
      timestamp: new Date().toISOString(),
    };

    await redis.setex(
      RedisKeys.commandAck(commandId),
      60,
      JSON.stringify(ackData)
    );

    logger.info('Command acknowledged', { commandId, droneId, status });
  }

  private async updateMissionStatus(
    missionId: string,
    action: CommandMessage['action']
  ): Promise<void> {
    const statusMap: Record<CommandMessage['action'], MissionStatus> = {
      START: MissionStatus.IN_PROGRESS,
      PAUSE: MissionStatus.PAUSED,
      RESUME: MissionStatus.IN_PROGRESS,
      ABORT: MissionStatus.ABORTED,
      RTH: MissionStatus.ABORTED,
    };

    const newStatus = statusMap[action];
    const updateData: any = { status: newStatus };

    if (action === 'START') {
      updateData.actualStart = new Date();
    } else if (action === 'ABORT' || action === 'RTH') {
      updateData.actualEnd = new Date();
    }

    await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
    });

    // Update Redis cache
    await redis.hset(RedisKeys.missionState(missionId), 'status', newStatus);

    logger.info('Mission status updated', { missionId, status: newStatus });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Validate command is allowed for current mission state
  async validateCommand(
    missionId: string,
    action: CommandMessage['action']
  ): Promise<{ valid: boolean; reason?: string }> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      select: { status: true },
    });

    if (!mission) {
      return { valid: false, reason: 'Mission not found' };
    }

    const allowedTransitions: Record<MissionStatus, CommandMessage['action'][]> = {
      [MissionStatus.PLANNED]: ['START'],
      [MissionStatus.IN_PROGRESS]: ['PAUSE', 'ABORT', 'RTH'],
      [MissionStatus.PAUSED]: ['RESUME', 'ABORT', 'RTH'],
      [MissionStatus.COMPLETED]: [],
      [MissionStatus.ABORTED]: [],
      [MissionStatus.FAILED]: [],
    };

    const allowed = allowedTransitions[mission.status];
    if (!allowed.includes(action)) {
      return {
        valid: false,
        reason: `Cannot ${action} mission in ${mission.status} status`,
      };
    }

    return { valid: true };
  }
}

export const commandService = CommandService.getInstance();
