/**
 * Real-time Analytics Processor
 * Processes live telemetry data for instant metrics and analytics
 */

import { EventEmitter } from 'events';
import { prisma } from '../lib/database';
import { redisClient } from '../lib/redis';
import { logger } from '../lib/logger';
import { WebSocketService } from '../websocket';

export interface LiveMetrics {
  missionId: string;
  droneId: string;
  timestamp: Date;
  efficiency: number;
  coverage: number;
  batteryLevel: number;
  altitude: number;
  speed: number;
  position: {
    latitude: number;
    longitude: number;
  };
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
  }>;
}

export interface FleetStatus {
  totalDrones: number;
  activeDrones: number;
  idleDrones: number;
  chargingDrones: number;
  maintenanceDrones: number;
  averageBattery: number;
  totalFlightTime: number;
  activeAlerts: number;
}

export interface MissionProgress {
  missionId: string;
  progress: number;
  estimatedCompletion: Date;
  efficiency: number;
  coveragePercentage: number;
  anomalies: string[];
}

export class RealtimeAnalyticsProcessor extends EventEmitter {
  private processingInterval: NodeJS.Timeout | null = null;
  private metricsCache = new Map<string, LiveMetrics>();
  private fleetStatusCache: FleetStatus | null = null;
  private missionProgressCache = new Map<string, MissionProgress>();
  private wsService: WebSocketService;

  constructor(wsService: WebSocketService) {
    super();
    this.wsService = wsService;
  }

  /**
   * Start real-time processing
   */
  async start(): Promise<void> {
    try {
      logger.info('Starting real-time analytics processor');

      // Process metrics every 5 seconds
      this.processingInterval = setInterval(async () => {
        await this.processLiveMetrics();
      }, 5000);

      // Listen for telemetry updates
      this.setupTelemetryListeners();

      logger.info('Real-time analytics processor started');
    } catch (error) {
      logger.error('Failed to start real-time analytics processor', { error });
      throw error;
    }
  }

  /**
   * Stop real-time processing
   */
  async stop(): Promise<void> {
    try {
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }

      this.removeAllListeners();
      logger.info('Real-time analytics processor stopped');
    } catch (error) {
      logger.error('Error stopping real-time analytics processor', { error });
    }
  }

  /**
   * Process telemetry data for live metrics
   */
  async processTelemetryData(telemetryData: any): Promise<void> {
    try {
      const { droneId, missionId, timestamp, ...data } = telemetryData;

      // Calculate live metrics
      const liveMetrics = await this.calculateLiveMetrics(droneId, missionId, data);
      
      // Cache metrics
      this.metricsCache.set(droneId, liveMetrics);

      // Update mission progress
      if (missionId) {
        await this.updateMissionProgress(missionId, liveMetrics);
      }

      // Update fleet status
      await this.updateFleetStatus();

      // Check for alerts
      const alerts = await this.checkRealTimeAlerts(liveMetrics);
      if (alerts.length > 0) {
        await this.handleAlerts(alerts, liveMetrics);
      }

      // Emit updates to WebSocket clients
      this.emitLiveUpdates(liveMetrics);

    } catch (error) {
      logger.error('Error processing telemetry data', { error, telemetryData });
    }
  }

  /**
   * Get current live metrics for a drone
   */
  getLiveMetrics(droneId: string): LiveMetrics | null {
    return this.metricsCache.get(droneId) || null;
  }

  /**
   * Get current fleet status
   */
  getFleetStatus(): FleetStatus | null {
    return this.fleetStatusCache;
  }

  /**
   * Get mission progress
   */
  getMissionProgress(missionId: string): MissionProgress | null {
    return this.missionProgressCache.get(missionId) || null;
  }

  /**
   * Get all active mission progress
   */
  getAllMissionProgress(): MissionProgress[] {
    return Array.from(this.missionProgressCache.values());
  }

  /**
   * Calculate live metrics from telemetry data
   */
  private async calculateLiveMetrics(
    droneId: string,
    missionId: string,
    telemetryData: any
  ): Promise<LiveMetrics> {
    const timestamp = new Date();

    // Get mission data for efficiency calculation
    const mission = missionId ? await prisma.mission.findUnique({
      where: { id: missionId },
      include: { waypoints: true }
    }) : null;

    // Calculate efficiency based on planned vs actual performance
    const efficiency = mission ? 
      await this.calculateRealTimeEfficiency(mission, telemetryData) : 0;

    // Calculate coverage percentage
    const coverage = mission ? 
      await this.calculateRealTimeCoverage(mission, telemetryData) : 0;

    // Check for alerts
    const alerts = await this.generateRealTimeAlerts(droneId, telemetryData);

    return {
      missionId: missionId || '',
      droneId,
      timestamp,
      efficiency,
      coverage,
      batteryLevel: telemetryData.battery || 0,
      altitude: telemetryData.altitude || 0,
      speed: telemetryData.speed || 0,
      position: {
        latitude: telemetryData.latitude || 0,
        longitude: telemetryData.longitude || 0,
      },
      alerts,
    };
  }

  /**
   * Calculate real-time efficiency
   */
  private async calculateRealTimeEfficiency(
    mission: any,
    telemetryData: any
  ): Promise<number> {
    try {
      // Get planned parameters
      const plannedSpeed = mission.plannedSpeed || 10; // m/s
      const plannedAltitude = mission.plannedAltitude || 100; // meters

      // Calculate efficiency factors
      const speedEfficiency = Math.min(1, telemetryData.speed / plannedSpeed);
      const altitudeEfficiency = Math.max(0, 1 - Math.abs(telemetryData.altitude - plannedAltitude) / plannedAltitude);
      const batteryEfficiency = telemetryData.battery / 100;

      // Weighted average
      const efficiency = (speedEfficiency * 0.4 + altitudeEfficiency * 0.3 + batteryEfficiency * 0.3) * 100;

      return Math.max(0, Math.min(100, efficiency));
    } catch (error) {
      logger.error('Error calculating real-time efficiency', { error });
      return 0;
    }
  }

  /**
   * Calculate real-time coverage
   */
  private async calculateRealTimeCoverage(
    mission: any,
    telemetryData: any
  ): Promise<number> {
    try {
      if (!mission.waypoints || mission.waypoints.length === 0) {
        return 0;
      }

      // Simple coverage calculation based on waypoint proximity
      const currentPosition = {
        lat: telemetryData.latitude,
        lng: telemetryData.longitude,
      };

      let completedWaypoints = 0;
      const proximityThreshold = 0.0001; // ~10 meters

      for (const waypoint of mission.waypoints) {
        const distance = this.calculateDistance(
          currentPosition,
          { lat: waypoint.latitude, lng: waypoint.longitude }
        );

        if (distance <= proximityThreshold) {
          completedWaypoints++;
        }
      }

      return (completedWaypoints / mission.waypoints.length) * 100;
    } catch (error) {
      logger.error('Error calculating real-time coverage', { error });
      return 0;
    }
  }

  /**
   * Generate real-time alerts
   */
  private async generateRealTimeAlerts(
    droneId: string,
    telemetryData: any
  ): Promise<Array<{ type: string; severity: string; message: string }>> {
    const alerts: Array<{ type: string; severity: string; message: string }> = [];

    // Battery alerts
    if (telemetryData.battery < 20) {
      alerts.push({
        type: 'battery',
        severity: telemetryData.battery < 10 ? 'critical' : 'high',
        message: `Low battery: ${telemetryData.battery}%`,
      });
    }

    // Altitude alerts
    if (telemetryData.altitude > 150) {
      alerts.push({
        type: 'altitude',
        severity: 'medium',
        message: `High altitude: ${telemetryData.altitude}m`,
      });
    }

    // Speed alerts
    if (telemetryData.speed > 20) {
      alerts.push({
        type: 'speed',
        severity: 'medium',
        message: `High speed: ${telemetryData.speed} m/s`,
      });
    }

    // Signal strength alerts
    if (telemetryData.signalStrength && telemetryData.signalStrength < -80) {
      alerts.push({
        type: 'signal',
        severity: 'high',
        message: `Weak signal: ${telemetryData.signalStrength} dBm`,
      });
    }

    return alerts;
  }

  /**
   * Update mission progress
   */
  private async updateMissionProgress(
    missionId: string,
    liveMetrics: LiveMetrics
  ): Promise<void> {
    try {
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        include: { waypoints: true }
      });

      if (!mission) return;

      // Calculate progress based on coverage and time
      const timeProgress = mission.estimatedDuration ? 
        Math.min(100, (Date.now() - mission.createdAt.getTime()) / (mission.estimatedDuration * 60 * 1000) * 100) : 0;
      
      const progress = Math.max(liveMetrics.coverage, timeProgress);

      // Estimate completion time
      const remainingProgress = 100 - progress;
      const progressRate = progress / ((Date.now() - mission.createdAt.getTime()) / (1000 * 60)); // progress per minute
      const estimatedMinutesRemaining = progressRate > 0 ? remainingProgress / progressRate : 0;
      
      const estimatedCompletion = new Date(Date.now() + estimatedMinutesRemaining * 60 * 1000);

      // Detect anomalies
      const anomalies: string[] = [];
      if (liveMetrics.efficiency < 70) anomalies.push('Low efficiency detected');
      if (liveMetrics.alerts.length > 0) anomalies.push('Active alerts present');
      if (progress < timeProgress - 20) anomalies.push('Behind schedule');

      const missionProgress: MissionProgress = {
        missionId,
        progress,
        estimatedCompletion,
        efficiency: liveMetrics.efficiency,
        coveragePercentage: liveMetrics.coverage,
        anomalies,
      };

      this.missionProgressCache.set(missionId, missionProgress);

      // Cache in Redis for persistence
      await redisClient.setex(
        `mission_progress:${missionId}`,
        300, // 5 minutes TTL
        JSON.stringify(missionProgress)
      );

    } catch (error) {
      logger.error('Error updating mission progress', { error, missionId });
    }
  }

  /**
   * Update fleet status
   */
  private async updateFleetStatus(): Promise<void> {
    try {
      // Get current drone statuses
      const drones = await prisma.drone.findMany({
        select: {
          id: true,
          status: true,
          batteryLevel: true,
        }
      });

      const totalDrones = drones.length;
      const activeDrones = drones.filter(d => d.status === 'ACTIVE').length;
      const idleDrones = drones.filter(d => d.status === 'IDLE').length;
      const chargingDrones = drones.filter(d => d.status === 'CHARGING').length;
      const maintenanceDrones = drones.filter(d => d.status === 'MAINTENANCE').length;

      const averageBattery = drones.length > 0 ? 
        drones.reduce((sum, d) => sum + (d.batteryLevel || 0), 0) / drones.length : 0;

      // Get total flight time from live metrics
      const totalFlightTime = Array.from(this.metricsCache.values())
        .reduce((sum, metrics) => sum + (metrics.timestamp.getTime() - Date.now() + 3600000) / 3600000, 0);

      // Count active alerts
      const activeAlerts = Array.from(this.metricsCache.values())
        .reduce((sum, metrics) => sum + metrics.alerts.length, 0);

      this.fleetStatusCache = {
        totalDrones,
        activeDrones,
        idleDrones,
        chargingDrones,
        maintenanceDrones,
        averageBattery,
        totalFlightTime,
        activeAlerts,
      };

      // Cache in Redis
      await redisClient.setex(
        'fleet_status',
        60, // 1 minute TTL
        JSON.stringify(this.fleetStatusCache)
      );

    } catch (error) {
      logger.error('Error updating fleet status', { error });
    }
  }

  /**
   * Process live metrics periodically
   */
  private async processLiveMetrics(): Promise<void> {
    try {
      // Clean up old metrics (older than 5 minutes)
      const cutoffTime = Date.now() - 5 * 60 * 1000;
      
      for (const [droneId, metrics] of this.metricsCache.entries()) {
        if (metrics.timestamp.getTime() < cutoffTime) {
          this.metricsCache.delete(droneId);
        }
      }

      // Clean up old mission progress
      for (const [missionId, progress] of this.missionProgressCache.entries()) {
        const mission = await prisma.mission.findUnique({
          where: { id: missionId },
          select: { status: true }
        });

        if (!mission || mission.status === 'COMPLETED' || mission.status === 'ABORTED') {
          this.missionProgressCache.delete(missionId);
        }
      }

      // Update aggregated metrics
      await this.updateAggregatedMetrics();

    } catch (error) {
      logger.error('Error processing live metrics', { error });
    }
  }

  /**
   * Update aggregated metrics in database
   */
  private async updateAggregatedMetrics(): Promise<void> {
    try {
      const now = new Date();
      
      // Update fleet metrics
      for (const [droneId, metrics] of this.metricsCache.entries()) {
        await prisma.fleetMetrics.upsert({
          where: {
            droneId_timestamp: {
              droneId,
              timestamp: now,
            }
          },
          update: {
            utilizationRate: metrics.efficiency / 100,
            averageBatteryLevel: metrics.batteryLevel,
            totalFlightTime: 1, // Increment by processing interval
          },
          create: {
            droneId,
            timestamp: now,
            utilizationRate: metrics.efficiency / 100,
            averageBatteryLevel: metrics.batteryLevel,
            totalFlightTime: 1,
          },
        });
      }

      // Update mission analytics for active missions
      for (const [missionId, progress] of this.missionProgressCache.entries()) {
        await prisma.missionAnalytics.upsert({
          where: {
            missionId_timestamp: {
              missionId,
              timestamp: now,
            }
          },
          update: {
            efficiency: progress.efficiency,
            coveragePercentage: progress.coveragePercentage,
          },
          create: {
            missionId,
            timestamp: now,
            duration: 0, // Will be updated when mission completes
            distance: 0, // Will be calculated from telemetry
            areaCovered: 0, // Will be calculated from coverage
            efficiency: progress.efficiency,
            coveragePercentage: progress.coveragePercentage,
          },
        });
      }

    } catch (error) {
      logger.error('Error updating aggregated metrics', { error });
    }
  }

  /**
   * Setup telemetry listeners
   */
  private setupTelemetryListeners(): void {
    // Listen for MQTT telemetry data
    this.on('telemetry', (data) => {
      this.processTelemetryData(data);
    });

    // Listen for mission events
    this.on('mission_event', (event) => {
      this.handleMissionEvent(event);
    });
  }

  /**
   * Handle mission events
   */
  private async handleMissionEvent(event: any): Promise<void> {
    try {
      const { type, missionId, data } = event;

      switch (type) {
        case 'mission_started':
          // Initialize mission progress tracking
          this.missionProgressCache.set(missionId, {
            missionId,
            progress: 0,
            estimatedCompletion: new Date(Date.now() + (data.estimatedDuration || 60) * 60 * 1000),
            efficiency: 100,
            coveragePercentage: 0,
            anomalies: [],
          });
          break;

        case 'mission_completed':
        case 'mission_aborted':
          // Clean up mission progress
          this.missionProgressCache.delete(missionId);
          break;
      }
    } catch (error) {
      logger.error('Error handling mission event', { error, event });
    }
  }

  /**
   * Check for real-time alerts
   */
  private async checkRealTimeAlerts(metrics: LiveMetrics): Promise<any[]> {
    const alerts: any[] = [];

    // Convert live metrics alerts to alert objects
    for (const alert of metrics.alerts) {
      alerts.push({
        type: alert.type,
        severity: alert.severity,
        droneId: metrics.droneId,
        missionId: metrics.missionId,
        message: alert.message,
        timestamp: metrics.timestamp,
      });
    }

    return alerts;
  }

  /**
   * Handle alerts
   */
  private async handleAlerts(alerts: any[], metrics: LiveMetrics): Promise<void> {
    try {
      // Store alerts in database
      for (const alert of alerts) {
        await prisma.performanceAlerts.create({
          data: {
            orgId: 'default-org', // Should be derived from drone/mission
            type: alert.type.toUpperCase(),
            severity: alert.severity.toUpperCase(),
            droneId: alert.droneId,
            missionId: alert.missionId || null,
            message: alert.message,
            threshold: this.getAlertThreshold(alert.type),
            currentValue: this.getAlertCurrentValue(alert.type, metrics),
          },
        });
      }

      // Emit alerts to WebSocket clients
      this.wsService.broadcast('alerts', {
        droneId: metrics.droneId,
        missionId: metrics.missionId,
        alerts,
        timestamp: metrics.timestamp,
      });

    } catch (error) {
      logger.error('Error handling alerts', { error, alerts });
    }
  }

  /**
   * Emit live updates to WebSocket clients
   */
  private emitLiveUpdates(metrics: LiveMetrics): void {
    try {
      // Emit drone metrics
      this.wsService.broadcast('drone_metrics', {
        droneId: metrics.droneId,
        metrics: {
          efficiency: metrics.efficiency,
          batteryLevel: metrics.batteryLevel,
          altitude: metrics.altitude,
          speed: metrics.speed,
          position: metrics.position,
        },
        timestamp: metrics.timestamp,
      });

      // Emit mission progress if available
      if (metrics.missionId) {
        const progress = this.missionProgressCache.get(metrics.missionId);
        if (progress) {
          this.wsService.broadcast('mission_progress', progress);
        }
      }

      // Emit fleet status
      if (this.fleetStatusCache) {
        this.wsService.broadcast('fleet_status', this.fleetStatusCache);
      }

    } catch (error) {
      logger.error('Error emitting live updates', { error });
    }
  }

  /**
   * Utility methods
   */
  private calculateDistance(
    pos1: { lat: number; lng: number },
    pos2: { lat: number; lng: number }
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = pos1.lat * Math.PI / 180;
    const φ2 = pos2.lat * Math.PI / 180;
    const Δφ = (pos2.lat - pos1.lat) * Math.PI / 180;
    const Δλ = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  private getAlertThreshold(type: string): number {
    const thresholds: Record<string, number> = {
      battery: 20,
      altitude: 150,
      speed: 20,
      signal: -80,
    };
    return thresholds[type] || 0;
  }

  private getAlertCurrentValue(type: string, metrics: LiveMetrics): number {
    switch (type) {
      case 'battery': return metrics.batteryLevel;
      case 'altitude': return metrics.altitude;
      case 'speed': return metrics.speed;
      default: return 0;
    }
  }
}

export default RealtimeAnalyticsProcessor;