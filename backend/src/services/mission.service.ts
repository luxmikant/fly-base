import { prisma } from '../lib/database';
import { redis, RedisKeys } from '../lib/redis';
import { publishToKafka, MissionEventMessage } from '../lib/kafka';
import { config } from '../config';
import { logger } from '../lib/logger';
import { recordMissionEvent } from '../lib/metrics';
import { v4 as uuidv4 } from 'uuid';
import { Mission, MissionStatus, FlightPattern, Prisma } from '@prisma/client';
import { FlightPlannerService } from './flight-planner.service';

export interface CreateMissionInput {
  orgId: string;
  siteId: string;
  droneId: string;
  name: string;
  surveyArea: GeoJSON.Polygon;
  flightPattern: FlightPattern;
  parameters: MissionParameters;
  scheduledStart?: Date;
  createdBy: string;
}

export interface MissionParameters {
  altitude: number;
  speed: number;
  overlap: number;
  gimbalAngle: number;
}

export interface MissionWithDetails extends Mission {
  site: { name: string; timezone: string };
  drone: { serialNumber: string; model: string; batteryLevel: number };
  creator: { name: string; email: string };
}

export class MissionService {
  private static instance: MissionService;
  private flightPlanner: FlightPlannerService;

  private constructor() {
    this.flightPlanner = FlightPlannerService.getInstance();
  }

  static getInstance(): MissionService {
    if (!MissionService.instance) {
      MissionService.instance = new MissionService();
    }
    return MissionService.instance;
  }

  async createMission(input: CreateMissionInput): Promise<Mission> {
    // Validate drone availability
    const drone = await prisma.drone.findUnique({
      where: { id: input.droneId },
    });

    if (!drone) {
      throw new Error('Drone not found');
    }

    if (drone.status !== 'AVAILABLE') {
      throw new Error(`Drone is not available (current status: ${drone.status})`);
    }

    // Generate flight plan
    const flightPlan = this.flightPlanner.generateFlightPlan(
      input.surveyArea,
      input.flightPattern,
      input.parameters
    );

    // Create mission in database
    const mission = await prisma.mission.create({
      data: {
        orgId: input.orgId,
        siteId: input.siteId,
        droneId: input.droneId,
        name: input.name,
        surveyArea: input.surveyArea as unknown as Prisma.JsonObject,
        flightPattern: input.flightPattern,
        parameters: input.parameters as unknown as Prisma.JsonObject,
        waypoints: flightPlan.waypoints as unknown as Prisma.JsonObject,
        estimatedDuration: flightPlan.estimatedDuration,
        estimatedDistance: flightPlan.estimatedDistance,
        scheduledStart: input.scheduledStart,
        createdBy: input.createdBy,
      },
    });

    // Initialize mission state in Redis
    await redis.hset(RedisKeys.missionState(mission.id), {
      status: MissionStatus.PLANNED,
      progress: '0',
      createdAt: mission.createdAt.toISOString(),
    });

    // Publish event to Kafka
    await this.publishMissionEvent(mission.id, input.droneId, 'CREATED', {
      name: mission.name,
      siteId: input.siteId,
      estimatedDuration: flightPlan.estimatedDuration,
    });

    recordMissionEvent('created', mission.id, input.siteId);
    logger.info('Mission created', { missionId: mission.id, name: mission.name });

    return mission;
  }

  async getMission(missionId: string): Promise<MissionWithDetails | null> {
    return prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        site: { select: { name: true, timezone: true } },
        drone: { select: { serialNumber: true, model: true, batteryLevel: true } },
        creator: { select: { name: true, email: true } },
      },
    });
  }

  async listMissions(
    filters: {
      orgId?: string;
      siteId?: string;
      droneId?: string;
      status?: MissionStatus;
    },
    pagination: { page: number; limit: number }
  ): Promise<{ missions: Mission[]; total: number }> {
    const where: Prisma.MissionWhereInput = {};
    
    if (filters.orgId) where.orgId = filters.orgId;
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.droneId) where.droneId = filters.droneId;
    if (filters.status) where.status = filters.status;

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: {
          site: { select: { name: true } },
          drone: { select: { serialNumber: true } },
        },
      }),
      prisma.mission.count({ where }),
    ]);

    return { missions, total };
  }

  async updateMission(
    missionId: string,
    updates: Partial<Pick<Mission, 'name' | 'scheduledStart' | 'parameters'>>
  ): Promise<Mission> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new Error('Mission not found');
    }

    if (mission.status !== MissionStatus.PLANNED) {
      throw new Error('Can only update missions in PLANNED status');
    }

    return prisma.mission.update({
      where: { id: missionId },
      data: updates as Prisma.MissionUpdateInput,
    });
  }

  async deleteMission(missionId: string): Promise<void> {
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new Error('Mission not found');
    }

    if (mission.status === MissionStatus.IN_PROGRESS) {
      throw new Error('Cannot delete mission in progress');
    }

    await prisma.mission.delete({ where: { id: missionId } });
    await redis.del(RedisKeys.missionState(missionId));

    logger.info('Mission deleted', { missionId });
  }

  async completeMission(missionId: string): Promise<void> {
    const mission = await prisma.mission.update({
      where: { id: missionId },
      data: {
        status: MissionStatus.COMPLETED,
        actualEnd: new Date(),
      },
    });

    // Update drone status back to available
    await prisma.drone.update({
      where: { id: mission.droneId },
      data: { status: 'AVAILABLE' },
    });

    // Update Redis
    await redis.hset(RedisKeys.missionState(missionId), 'status', MissionStatus.COMPLETED);

    // Publish event
    await this.publishMissionEvent(missionId, mission.droneId, 'COMPLETED', {
      actualEnd: new Date().toISOString(),
    });

    recordMissionEvent('completed', missionId, mission.siteId);
    logger.info('Mission completed', { missionId });
  }

  async getMissionProgress(missionId: string): Promise<{
    status: string;
    progress: number;
    eta?: number;
    currentWaypoint?: number;
    battery?: number;
  } | null> {
    const state = await redis.hgetall(RedisKeys.missionState(missionId));
    
    if (!state || Object.keys(state).length === 0) {
      return null;
    }

    return {
      status: state.status,
      progress: parseFloat(state.progress || '0'),
      eta: state.eta ? parseInt(state.eta, 10) : undefined,
      currentWaypoint: state.currentWaypoint ? parseInt(state.currentWaypoint, 10) : undefined,
      battery: state.battery ? parseInt(state.battery, 10) : undefined,
    };
  }

  private async publishMissionEvent(
    missionId: string,
    droneId: string,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    const event: MissionEventMessage = {
      eventId: uuidv4(),
      missionId,
      droneId,
      eventType,
      payload,
      timestamp: new Date().toISOString(),
    };

    await publishToKafka(config.kafka.topics.events, [
      {
        key: missionId,
        value: JSON.stringify(event),
        headers: { eventType },
      },
    ]);
  }
}

export const missionService = MissionService.getInstance();
