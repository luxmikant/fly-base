import { prisma } from '../lib/database';
import { redis, RedisKeys } from '../lib/redis';
import { logger } from '../lib/logger';
import { metrics, MetricNames } from '../lib/metrics';
import { Drone, DroneStatus, Prisma } from '@prisma/client';

export interface DroneWithLocation extends Drone {
  currentLocation?: {
    latitude: number;
    longitude: number;
    altitude: number;
    timestamp: string;
  };
}

export interface FleetStatus {
  total: number;
  available: number;
  inMission: number;
  charging: number;
  maintenance: number;
  offline: number;
}

export class DroneService {
  private static instance: DroneService;

  private constructor() {}

  static getInstance(): DroneService {
    if (!DroneService.instance) {
      DroneService.instance = new DroneService();
    }
    return DroneService.instance;
  }

  async getDrone(droneId: string): Promise<DroneWithLocation | null> {
    const drone = await prisma.drone.findUnique({
      where: { id: droneId },
      include: {
        site: { select: { name: true, timezone: true } },
      },
    });

    if (!drone) return null;

    // Get live location from Redis
    const locationData = await redis.get(RedisKeys.droneLocation(droneId));
    const currentLocation = locationData ? JSON.parse(locationData) : undefined;

    return { ...drone, currentLocation };
  }

  async listDrones(
    filters: {
      siteId?: string;
      status?: DroneStatus;
    },
    pagination: { page: number; limit: number }
  ): Promise<{ drones: Drone[]; total: number }> {
    const where: Prisma.DroneWhereInput = {};
    
    if (filters.siteId) where.siteId = filters.siteId;
    if (filters.status) where.status = filters.status;

    const [drones, total] = await Promise.all([
      prisma.drone.findMany({
        where,
        orderBy: { serialNumber: 'asc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
        include: {
          site: { select: { name: true } },
        },
      }),
      prisma.drone.count({ where }),
    ]);

    return { drones, total };
  }

  async updateDroneStatus(droneId: string, status: DroneStatus): Promise<Drone> {
    const drone = await prisma.drone.update({
      where: { id: droneId },
      data: {
        status,
        lastSeen: new Date(),
      },
    });

    // Update site fleet status cache
    await this.updateSiteFleetCache(drone.siteId);

    // Record metrics
    if (status === DroneStatus.OFFLINE) {
      metrics.increment(MetricNames.droneOffline, { drone_id: droneId });
    } else if (status === DroneStatus.AVAILABLE) {
      metrics.increment(MetricNames.droneOnline, { drone_id: droneId });
    }

    logger.info('Drone status updated', { droneId, status });
    return drone;
  }

  async updateDroneBattery(droneId: string, batteryLevel: number): Promise<void> {
    await prisma.drone.update({
      where: { id: droneId },
      data: {
        batteryLevel,
        lastSeen: new Date(),
      },
    });

    // Alert on low battery
    if (batteryLevel < 20) {
      metrics.increment(MetricNames.droneBatteryLow, { drone_id: droneId });
      logger.warn('Drone battery low', { droneId, batteryLevel });
    }
  }

  async getFleetStatus(siteId: string): Promise<FleetStatus> {
    // Try cache first
    const cached = await redis.hgetall(RedisKeys.siteFleetStatus(siteId));
    
    if (cached && Object.keys(cached).length > 0) {
      return {
        total: parseInt(cached.total || '0', 10),
        available: parseInt(cached.available || '0', 10),
        inMission: parseInt(cached.inMission || '0', 10),
        charging: parseInt(cached.charging || '0', 10),
        maintenance: parseInt(cached.maintenance || '0', 10),
        offline: parseInt(cached.offline || '0', 10),
      };
    }

    // Calculate from database
    const counts = await prisma.drone.groupBy({
      by: ['status'],
      where: { siteId },
      _count: true,
    });

    const status: FleetStatus = {
      total: 0,
      available: 0,
      inMission: 0,
      charging: 0,
      maintenance: 0,
      offline: 0,
    };

    for (const count of counts) {
      const key = count.status.toLowerCase().replace('_', '') as keyof FleetStatus;
      if (count.status === 'IN_MISSION') {
        status.inMission = count._count;
      } else if (key in status) {
        (status as any)[key] = count._count;
      }
      status.total += count._count;
    }

    // Cache for 30 seconds
    await redis.hset(RedisKeys.siteFleetStatus(siteId), {
      total: status.total.toString(),
      available: status.available.toString(),
      inMission: status.inMission.toString(),
      charging: status.charging.toString(),
      maintenance: status.maintenance.toString(),
      offline: status.offline.toString(),
    });
    await redis.expire(RedisKeys.siteFleetStatus(siteId), 30);

    return status;
  }

  async getAvailableDrones(siteId: string, minBattery: number = 30): Promise<Drone[]> {
    return prisma.drone.findMany({
      where: {
        siteId,
        status: DroneStatus.AVAILABLE,
        batteryLevel: { gte: minBattery },
      },
      orderBy: { batteryLevel: 'desc' },
    });
  }

  async getNearbyDrones(
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
      'WITHDIST',
      'ASC'
    );

    return results.map((r: any) => ({
      droneId: r[0],
      distance: parseFloat(r[1]),
    }));
  }

  private async updateSiteFleetCache(siteId: string): Promise<void> {
    // Invalidate cache to force recalculation
    await redis.del(RedisKeys.siteFleetStatus(siteId));
  }

  async registerDrone(data: {
    siteId: string;
    serialNumber: string;
    model: string;
    homeLatitude: number;
    homeLongitude: number;
    firmwareVersion?: string;
  }): Promise<Drone> {
    const drone = await prisma.drone.create({
      data: {
        ...data,
        status: DroneStatus.AVAILABLE,
        batteryLevel: 100,
      },
    });

    await this.updateSiteFleetCache(data.siteId);
    logger.info('Drone registered', { droneId: drone.id, serialNumber: data.serialNumber });

    return drone;
  }

  async decommissionDrone(droneId: string): Promise<void> {
    const drone = await prisma.drone.findUnique({
      where: { id: droneId },
    });

    if (!drone) {
      throw new Error('Drone not found');
    }

    if (drone.status === DroneStatus.IN_MISSION) {
      throw new Error('Cannot decommission drone while in mission');
    }

    await prisma.drone.delete({ where: { id: droneId } });
    await redis.zrem(RedisKeys.droneLive, droneId);
    await redis.del(RedisKeys.droneLocation(droneId));
    await this.updateSiteFleetCache(drone.siteId);

    logger.info('Drone decommissioned', { droneId });
  }
}

export const droneService = DroneService.getInstance();
