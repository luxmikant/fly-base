/**
 * Analytics Service
 * Core analytics engine for mission and fleet performance calculations
 * Implements comprehensive analytics features including:
 * - Mission performance metrics calculation (duration, distance, area, coverage)
 * - Coverage efficiency algorithms with gap and overlap detection
 * - Fleet utilization analysis with maintenance predictions
 * - Performance anomaly detection and recommendations
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import {
  MissionMetrics,
  FleetUtilization,
  DroneUtilization,
  OrgMetrics,
  SiteMetrics,
  CoverageAnalysis,
  TimeRange,
  TrendPoint,
  SeasonalData,
  MaintenanceAlert,
  PerformanceScore,
  AnalyticsQuery,
  AnalyticsFilters
} from '../types/analytics.types';
import {
  validateMissionMetrics,
  validateFleetUtilization,
  validateOrgMetrics,
  validateSiteMetrics,
  validateCoverageAnalysis
} from '../validation/analytics.validation';

/**
 * Custom error classes for better error handling
 */
class AnalyticsError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AnalyticsError';
  }
}

class DataNotFoundError extends AnalyticsError {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`, 'NOT_FOUND', { entity, id });
    this.name = 'DataNotFoundError';
  }
}

class InsufficientDataError extends AnalyticsError {
  constructor(message: string, details?: any) {
    super(message, 'INSUFFICIENT_DATA', details);
    this.name = 'InsufficientDataError';
  }
}

export class AnalyticsService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // Mission Analytics Methods

  /**
   * Get comprehensive performance metrics for a specific mission
   */
  async getMissionPerformanceMetrics(missionId: string): Promise<MissionMetrics> {
    try {
      logger.info('Fetching mission performance metrics', { missionId });

      const missionAnalytics = await this.prisma.missionAnalytics.findUnique({
        where: { missionId },
        include: {
          mission: {
            include: {
              drone: true,
              site: true
            }
          },
          coverageAnalysis: true
        }
      });

      if (!missionAnalytics) {
        throw new Error(`Mission analytics not found for mission ${missionId}`);
      }

      const metrics: MissionMetrics = {
        missionId: missionAnalytics.missionId,
        duration: missionAnalytics.actualDuration || 0,
        distanceCovered: missionAnalytics.actualDistance || 0,
        areaSurveyed: missionAnalytics.areaSurveyed || 0,
        coverageEfficiency: missionAnalytics.coverageEfficiency || 0,
        batteryConsumption: missionAnalytics.batteryConsumption || 0,
        averageSpeed: missionAnalytics.averageSpeed || 0,
        averageAltitude: missionAnalytics.averageAltitude || 0,
        maxAltitude: missionAnalytics.maxAltitude || 0,
        minAltitude: missionAnalytics.minAltitude || 0,
        telemetryPoints: missionAnalytics.telemetryPoints || 0,
        successRate: missionAnalytics.mission.status === 'COMPLETED' ? 100 : 0,
        qualityScore: missionAnalytics.qualityScore || 0,
        weatherConditions: missionAnalytics.weatherConditions as any,
        flightPathData: missionAnalytics.flightPathData as any
      };

      return validateMissionMetrics(metrics);
    } catch (error) {
      logger.error('Error fetching mission performance metrics', { error, missionId });
      throw error;
    }
  }

  /**
   * Calculate coverage efficiency and identify gaps/overlaps
   * This is the comprehensive version that returns full CoverageAnalysis
   */
  async calculateCoverageEfficiency(missionId: string): Promise<CoverageAnalysis> {
    try {
      logger.info('Calculating coverage efficiency', { missionId });

      // Check if analysis already exists
      const existingAnalysis = await this.prisma.coverageAnalysis.findFirst({
        where: {
          missionAnalytics: {
            missionId: missionId
          }
        },
        include: {
          missionAnalytics: true
        }
      });

      if (existingAnalysis) {
        return this.mapToCoverageAnalysis(existingAnalysis, missionId);
      }

      // Get mission data
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          missionAnalytics: true
        }
      });

      if (!mission) {
        throw new Error(`Mission ${missionId} not found`);
      }

      if (!mission.missionAnalytics) {
        throw new Error(`Mission analytics not calculated for mission ${missionId}`);
      }

      // Extract planned area from survey area
      const surveyArea = mission.surveyArea as any;
      const plannedArea = this.calculatePolygonArea(surveyArea);

      // Get actual coverage from analytics
      const actualCoverage = mission.missionAnalytics.areaSurveyed || 0;
      const coveragePercentage = plannedArea > 0 ? (actualCoverage / plannedArea) * 100 : 0;

      // Analyze gaps (simplified - in production would use actual flight path)
      const gapAreas = this.identifyGapAreas(surveyArea, coveragePercentage);

      // Analyze overlaps
      const overlapAreas = this.identifyOverlapAreas(mission.missionAnalytics.flightPathData as any);

      // Calculate overlap efficiency (ideal is 20-30%)
      const overlapEfficiency = this.calculateOverlapEfficiency(overlapAreas, actualCoverage);

      // Check pattern compliance
      const patternCompliance = this.checkPatternCompliance(
        mission.flightPattern,
        mission.missionAnalytics.flightPathData as any,
        mission.parameters as any
      );

      // Calculate quality score
      const qualityScore = this.calculateCoverageQualityScore({
        coveragePercentage,
        overlapEfficiency,
        patternCompliance,
        gapCount: gapAreas.length
      });

      // Generate recommendations
      const recommendations = this.generateCoverageRecommendations({
        coveragePercentage,
        gapAreas,
        overlapEfficiency,
        patternCompliance
      });

      // Check industry standards
      const industryStandards = this.checkIndustryStandards({
        coveragePercentage,
        overlapEfficiency,
        patternCompliance
      });

      // Store analysis in database
      const createdAnalysis = await this.prisma.coverageAnalysis.create({
        data: {
          missionAnalyticsId: mission.missionAnalytics.id,
          plannedArea,
          actualCoverage,
          coveragePercentage,
          gapAreas: gapAreas as any,
          overlapAreas: overlapAreas as any,
          overlapEfficiency,
          patternCompliance,
          qualityScore,
          recommendations,
          industryStandards: industryStandards as any
        }
      });

      return this.mapToCoverageAnalysis(createdAnalysis, missionId);
    } catch (error) {
      logger.error('Error calculating coverage efficiency', { error, missionId });
      throw error;
    }
  }

  /**
   * Generate comprehensive mission report
   */
  async generateMissionReport(missionId: string): Promise<any> {
    try {
      logger.info('Generating mission report', { missionId });

      const [metrics, coverage] = await Promise.all([
        this.getMissionPerformanceMetrics(missionId),
        this.getCoverageAnalysis(missionId)
      ]);

      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          drone: true,
          site: true,
          organization: true
        }
      });

      if (!mission) {
        throw new Error(`Mission not found: ${missionId}`);
      }

      return {
        mission: {
          id: mission.id,
          name: mission.name,
          status: mission.status,
          scheduledStart: mission.scheduledStart,
          actualStart: mission.actualStart,
          actualEnd: mission.actualEnd
        },
        performance: metrics,
        coverage: coverage,
        telemetry: {
          totalPoints: metrics.telemetryPoints,
          flightPath: metrics.flightPathData || [],
          batteryUsage: this.generateBatteryUsageData(metrics)
        },
        weather: metrics.weatherConditions,
        recommendations: this.generateMissionRecommendations(metrics, coverage),
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating mission report', { error, missionId });
      throw error;
    }
  }

  // Fleet Analytics Methods

  /**
   * Get fleet utilization metrics for a site
   */
  async getFleetUtilization(siteId: string, timeRange: TimeRange): Promise<FleetUtilization> {
    try {
      logger.info('Fetching fleet utilization', { siteId, timeRange });

      const [fleetMetrics, drones] = await Promise.all([
        this.prisma.fleetMetrics.findMany({
          where: {
            siteId: siteId,
            date: {
              gte: timeRange.start,
              lte: timeRange.end
            }
          },
          include: {
            drone: true
          }
        }),
        this.prisma.drone.findMany({
          where: { siteId }
        })
      ]);

      // Aggregate metrics by drone
      const droneUtilizationMap = new Map<string, any>();
      
      for (const metric of fleetMetrics) {
        const droneId = metric.droneId;
        if (!droneUtilizationMap.has(droneId)) {
          droneUtilizationMap.set(droneId, {
            droneId: droneId,
            serialNumber: metric.drone.serialNumber,
            model: metric.drone.model,
            totalFlightTime: 0,
            totalMissions: 0,
            successfulMissions: 0,
            failedMissions: 0,
            batteryUsage: 0,
            maintenanceEvents: 0,
            downtimeMinutes: 0,
            performanceScores: []
          });
        }

        const droneData = droneUtilizationMap.get(droneId);
        droneData.totalFlightTime += metric.totalFlightTime;
        droneData.totalMissions += metric.totalMissions;
        droneData.successfulMissions += metric.successfulMissions;
        droneData.failedMissions += metric.failedMissions;
        droneData.batteryUsage += metric.batteryUsage;
        droneData.maintenanceEvents += metric.maintenanceEvents;
        droneData.downtimeMinutes += metric.downtimeMinutes;
        if (metric.performanceScore) {
          droneData.performanceScores.push(metric.performanceScore);
        }
      }

      // Calculate derived metrics
      const utilizationByDrone: DroneUtilization[] = Array.from(droneUtilizationMap.values()).map(data => ({
        ...data,
        averageMissionTime: data.totalMissions > 0 ? data.totalFlightTime / data.totalMissions : 0,
        utilizationRate: this.calculateUtilizationRate(data.totalFlightTime, timeRange),
        performanceScore: data.performanceScores.length > 0 
          ? data.performanceScores.reduce((sum: number, score: number) => sum + score, 0) / data.performanceScores.length 
          : 0
      }));

      // Calculate fleet-level metrics
      const totalFlightHours = utilizationByDrone.reduce((sum, drone) => sum + drone.totalFlightTime, 0) / 60;
      const totalMissions = utilizationByDrone.reduce((sum, drone) => sum + drone.totalMissions, 0);
      const totalSuccessful = utilizationByDrone.reduce((sum, drone) => sum + drone.successfulMissions, 0);
      const averageMissionDuration = totalMissions > 0 ? (totalFlightHours * 60) / totalMissions : 0;
      const fleetSuccessRate = totalMissions > 0 ? (totalSuccessful / totalMissions) * 100 : 0;

      const [maintenanceAlerts, performanceScores] = await Promise.all([
        this.getMaintenanceAlerts(siteId),
        this.getPerformanceScores(siteId)
      ]);

      const fleetUtilization: FleetUtilization = {
        siteId,
        totalFlightHours,
        averageMissionDuration,
        fleetSuccessRate,
        utilizationByDrone,
        maintenanceAlerts,
        performanceScores,
        timeRange
      };

      return validateFleetUtilization(fleetUtilization);
    } catch (error) {
      logger.error('Error fetching fleet utilization', { error, siteId });
      throw error;
    }
  }

  /**
   * Calculate comprehensive maintenance schedule for a drone
   * Predicts maintenance needs based on usage patterns
   */
  async calculateMaintenanceSchedule(droneId: string): Promise<MaintenanceAlert[]> {
    try {
      logger.info('Calculating maintenance schedule', { droneId });

      const drone = await this.prisma.drone.findUnique({
        where: { id: droneId },
        include: {
          fleetMetrics: {
            orderBy: { date: 'desc' },
            take: 90 // Last 90 days
          },
          missions: {
            where: { status: 'COMPLETED' },
            orderBy: { actualEnd: 'desc' },
            take: 50,
            include: {
              missionAnalytics: true
            }
          }
        }
      });

      if (!drone) {
        throw new Error(`Drone not found: ${droneId}`);
      }

      const alerts: MaintenanceAlert[] = [];

      // Calculate total flight time
      const totalFlightTime = drone.fleetMetrics.reduce((sum, metric) => sum + metric.totalFlightTime, 0);
      const totalMaintenanceEvents = drone.fleetMetrics.reduce((sum, metric) => sum + metric.maintenanceEvents, 0);
      const totalFlightHours = totalFlightTime / 60;

      // Maintenance intervals (in hours)
      const ROUTINE_MAINTENANCE_INTERVAL = 33; // ~33 hours
      const MAJOR_MAINTENANCE_INTERVAL = 100; // ~100 hours
      const BATTERY_CHECK_INTERVAL = 8; // ~8 hours (500 minutes)

      // Check routine maintenance
      const hoursSinceLastRoutine = totalFlightHours % ROUTINE_MAINTENANCE_INTERVAL;
      if (hoursSinceLastRoutine >= ROUTINE_MAINTENANCE_INTERVAL * 0.9) {
        const daysUntilDue = Math.ceil((ROUTINE_MAINTENANCE_INTERVAL - hoursSinceLastRoutine) / 2); // 2 hrs avg per day
        alerts.push({
          droneId,
          alertType: hoursSinceLastRoutine >= ROUTINE_MAINTENANCE_INTERVAL ? 'overdue' : 'due',
          severity: hoursSinceLastRoutine >= ROUTINE_MAINTENANCE_INTERVAL ? 'high' : 'medium',
          message: `Routine maintenance ${hoursSinceLastRoutine >= ROUTINE_MAINTENANCE_INTERVAL ? 'overdue' : 'due soon'}`,
          dueDate: new Date(Date.now() + Math.max(0, daysUntilDue) * 24 * 60 * 60 * 1000),
          estimatedDowntime: 120, // 2 hours
          maintenanceType: 'routine'
        });
      }

      // Check major maintenance
      const hoursSinceLastMajor = totalFlightHours % MAJOR_MAINTENANCE_INTERVAL;
      if (hoursSinceLastMajor >= MAJOR_MAINTENANCE_INTERVAL * 0.95) {
        const daysUntilDue = Math.ceil((MAJOR_MAINTENANCE_INTERVAL - hoursSinceLastMajor) / 2);
        alerts.push({
          droneId,
          alertType: hoursSinceLastMajor >= MAJOR_MAINTENANCE_INTERVAL ? 'overdue' : 'due',
          severity: 'high',
          message: `Major maintenance ${hoursSinceLastMajor >= MAJOR_MAINTENANCE_INTERVAL ? 'overdue' : 'required soon'}`,
          dueDate: new Date(Date.now() + Math.max(0, daysUntilDue) * 24 * 60 * 60 * 1000),
          estimatedDowntime: 480, // 8 hours
          maintenanceType: 'major'
        });
      }

      // Check battery health based on recent usage patterns
      const recentBatteryUsage = drone.fleetMetrics.slice(0, 7).reduce(
        (sum, m) => sum + m.batteryUsage,
        0
      ) / Math.min(7, drone.fleetMetrics.length);

      if (recentBatteryUsage > 500 || drone.batteryLevel < 20) {
        alerts.push({
          droneId,
          alertType: 'recommended',
          severity: drone.batteryLevel < 20 ? 'high' : 'medium',
          message: 'Battery health check recommended due to high usage or low charge',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          estimatedDowntime: 60,
          maintenanceType: 'battery'
        });
      }

      // Check performance degradation
      const recentPerformanceScores = drone.fleetMetrics.slice(0, 7)
        .map(m => m.performanceScore)
        .filter(score => score !== null) as number[];
      
      const avgPerformanceScore = recentPerformanceScores.length > 0
        ? recentPerformanceScores.reduce((sum, score) => sum + score, 0) / recentPerformanceScores.length
        : 100;

      if (avgPerformanceScore < 70) {
        alerts.push({
          droneId,
          alertType: 'recommended',
          severity: avgPerformanceScore < 50 ? 'high' : 'medium',
          message: `Performance degradation detected (score: ${avgPerformanceScore.toFixed(1)}) - inspection recommended`,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          estimatedDowntime: 180,
          maintenanceType: 'inspection'
        });
      }

      // Check excessive maintenance events
      if (totalMaintenanceEvents > 5) {
        alerts.push({
          droneId,
          alertType: 'recommended',
          severity: 'medium',
          message: `High maintenance frequency (${totalMaintenanceEvents} events) - consider detailed inspection`,
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          estimatedDowntime: 240,
          maintenanceType: 'inspection'
        });
      }

      logger.info(`Generated ${alerts.length} maintenance alerts for drone ${droneId}`);
      return alerts;
    } catch (error) {
      logger.error('Error calculating maintenance schedule', { error, droneId });
      throw error;
    }
  }

  /**
   * Identify performance anomalies across the fleet with detailed analysis
   * Returns anomalies with severity and specific recommendations
   */
  async identifyPerformanceAnomalies(
    siteId?: string
  ): Promise<Array<{
    type: string;
    droneId: string;
    serialNumber: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    value: number;
    threshold: number;
    description: string;
    recommendation?: string;
  }>> {
    try {
      logger.info('Identifying performance anomalies', { siteId });

      const whereClause: any = {
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      };

      if (siteId) {
        whereClause.siteId = siteId;
      }

      const recentMetrics = await this.prisma.fleetMetrics.findMany({
        where: whereClause,
        include: {
          drone: true
        }
      });

      const anomalies: Array<{
        type: string;
        droneId: string;
        serialNumber: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        value: number;
        threshold: number;
        description: string;
        recommendation?: string;
      }> = [];

      const dronePerformance = new Map();

      // Group by drone and calculate averages
      for (const metric of recentMetrics) {
        if (!dronePerformance.has(metric.droneId)) {
          dronePerformance.set(metric.droneId, {
            drone: metric.drone,
            performanceScores: [],
            utilizationRates: [],
            successRates: [],
            batteryUsages: [],
            maintenanceEvents: 0
          });
        }

        const data = dronePerformance.get(metric.droneId);
        if (metric.performanceScore) data.performanceScores.push(metric.performanceScore);
        if (metric.utilizationRate) data.utilizationRates.push(metric.utilizationRate);
        if (metric.batteryUsage) data.batteryUsages.push(metric.batteryUsage);
        data.maintenanceEvents += metric.maintenanceEvents;
        
        const successRate = metric.totalMissions > 0 ? (metric.successfulMissions / metric.totalMissions) * 100 : 0;
        data.successRates.push(successRate);
      }

      // Calculate fleet-wide statistics for comparison
      const allPerformanceScores: number[] = [];
      const allUtilizationRates: number[] = [];
      const allSuccessRates: number[] = [];

      for (const data of dronePerformance.values()) {
        allPerformanceScores.push(...data.performanceScores);
        allUtilizationRates.push(...data.utilizationRates);
        allSuccessRates.push(...data.successRates);
      }

      const fleetAvgPerformance = allPerformanceScores.length > 0
        ? allPerformanceScores.reduce((sum, s) => sum + s, 0) / allPerformanceScores.length
        : 0;

      const fleetAvgUtilization = allUtilizationRates.length > 0
        ? allUtilizationRates.reduce((sum, r) => sum + r, 0) / allUtilizationRates.length
        : 0;

      const fleetAvgSuccessRate = allSuccessRates.length > 0
        ? allSuccessRates.reduce((sum, r) => sum + r, 0) / allSuccessRates.length
        : 0;

      // Identify anomalies for each drone
      for (const [droneId, data] of dronePerformance) {
        const avgPerformance = data.performanceScores.length > 0 
          ? data.performanceScores.reduce((sum: number, score: number) => sum + score, 0) / data.performanceScores.length 
          : 0;
        
        const avgUtilization = data.utilizationRates.length > 0
          ? data.utilizationRates.reduce((sum: number, rate: number) => sum + rate, 0) / data.utilizationRates.length
          : 0;

        const avgSuccessRate = data.successRates.length > 0
          ? data.successRates.reduce((sum: number, rate: number) => sum + rate, 0) / data.successRates.length
          : 0;

        const avgBatteryUsage = data.batteryUsages.length > 0
          ? data.batteryUsages.reduce((sum: number, usage: number) => sum + usage, 0) / data.batteryUsages.length
          : 0;

        // Critical performance degradation
        if (avgPerformance < 40) {
          anomalies.push({
            type: 'critical_performance_degradation',
            droneId,
            serialNumber: data.drone.serialNumber,
            severity: 'critical',
            value: avgPerformance,
            threshold: 40,
            description: `Critical performance degradation - score ${avgPerformance.toFixed(1)} (fleet avg: ${fleetAvgPerformance.toFixed(1)})`,
            recommendation: 'Immediate inspection required - ground drone until issues resolved'
          });
        } else if (avgPerformance < 60) {
          anomalies.push({
            type: 'low_performance',
            droneId,
            serialNumber: data.drone.serialNumber,
            severity: 'high',
            value: avgPerformance,
            threshold: 60,
            description: `Low performance score ${avgPerformance.toFixed(1)} (fleet avg: ${fleetAvgPerformance.toFixed(1)})`,
            recommendation: 'Schedule detailed inspection and performance diagnostics'
          });
        } else if (avgPerformance < fleetAvgPerformance * 0.7) {
          anomalies.push({
            type: 'below_fleet_average',
            droneId,
            serialNumber: data.drone.serialNumber,
            severity: 'medium',
            value: avgPerformance,
            threshold: fleetAvgPerformance * 0.7,
            description: `Performance ${avgPerformance.toFixed(1)} significantly below fleet average ${fleetAvgPerformance.toFixed(1)}`,
            recommendation: 'Review recent missions and perform routine maintenance'
          });
        }

        // Low utilization anomaly
        if (avgUtilization < 20 && avgUtilization > 0) {
          anomalies.push({
            type: 'low_utilization',
            droneId,
            serialNumber: data.drone.serialNumber,
            severity: 'low',
            value: avgUtilization,
            threshold: 20,
            description: `Very low utilization ${avgUtilization.toFixed(1)}% (fleet avg: ${fleetAvgUtilization.toFixed(1)}%)`,
            recommendation: 'Review scheduling and availability - consider redeployment'
          });
        } else if (avgUtilization > 85) {
          anomalies.push({
            type: 'over_utilization',
            droneId,
            serialNumber: data.drone.serialNumber,
            severity: 'medium',
            value: avgUtilization,
            threshold: 85,
            description: `Over-utilization detected ${avgUtilization.toFixed(1)}% - risk of accelerated wear`,
            recommendation: 'Reduce workload and schedule additional maintenance checks'
          });
        }

        // Success rate anomaly
        if (avgSuccessRate < 60) {
          anomalies.push({
            type: 'low_success_rate',
            droneId,
            serialNumber: data.drone.serialNumber,
            severity: 'critical',
            value: avgSuccessRate,
            threshold: 60,
            description: `Critical mission failure rate ${(100 - avgSuccessRate).toFixed(1)}% (success: ${avgSuccessRate.toFixed(1)}%)`,
            recommendation: 'Immediate investigation required - check systems and operator training'
          });
        } else if (avgSuccessRate < 80) {
          anomalies.push({
            type: 'suboptimal_success_rate',
            droneId,
            serialNumber: data.drone.serialNumber,
            severity: 'high',
            value: avgSuccessRate,
            threshold: 80,
            description: `Below-target success rate ${avgSuccessRate.toFixed(1)}% (target: 80%+)`,
            recommendation: 'Analyze mission failures and address recurring issues'
          });
        }

        // High battery consumption anomaly
        if (avgBatteryUsage > 700) { // Per day average
          anomalies.push({
            type: 'high_battery_consumption',
            droneId,
            serialNumber: data.drone.serialNumber,
            severity: 'medium',
            value: avgBatteryUsage,
            threshold: 700,
            description: `Abnormally high battery consumption ${avgBatteryUsage.toFixed(0)}%/day`,
            recommendation: 'Check battery health and power systems'
          });
        }

        // High maintenance frequency anomaly
        if (data.maintenanceEvents > 5) {
          anomalies.push({
            type: 'frequent_maintenance',
            droneId,
            serialNumber: data.drone.serialNumber,
            severity: data.maintenanceEvents > 10 ? 'high' : 'medium',
            value: data.maintenanceEvents,
            threshold: 5,
            description: `High maintenance frequency - ${data.maintenanceEvents} events in 7 days`,
            recommendation: 'Investigate root cause of repeated maintenance needs'
          });
        }
      }

      // Sort by severity (critical > high > medium > low)
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      logger.info(`Identified ${anomalies.length} performance anomalies`, { 
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length
      });

      return anomalies;
    } catch (error) {
      logger.error('Error identifying performance anomalies', { error });
      throw error;
    }
  }

  // Organization Analytics Methods

  /**
   * Get organization-wide metrics
   */
  async getOrganizationMetrics(orgId: string, timeRange: TimeRange): Promise<OrgMetrics> {
    try {
      logger.info('Fetching organization metrics', { orgId, timeRange });

      const orgMetrics = await this.prisma.organizationMetrics.findMany({
        where: {
          orgId: orgId,
          date: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        orderBy: { date: 'asc' }
      });

      if (orgMetrics.length === 0) {
        throw new Error(`No organization metrics found for organization ${orgId}`);
      }

      // Aggregate metrics
      const totalSurveys = orgMetrics.reduce((sum, metric) => sum + metric.totalSurveys, 0);
      const totalAreaCovered = orgMetrics.reduce((sum, metric) => sum + metric.totalAreaCovered, 0);
      const totalFlightTime = orgMetrics.reduce((sum, metric) => sum + metric.totalFlightTime, 0) / 60; // Convert to hours
      
      const avgEfficiency = orgMetrics.reduce((sum, metric) => sum + (metric.averageEfficiency || 0), 0) / orgMetrics.length;
      const avgSuccessRate = orgMetrics.reduce((sum, metric) => sum + (metric.successRate || 0), 0) / orgMetrics.length;
      const avgCostPerSurvey = orgMetrics.reduce((sum, metric) => sum + (metric.costPerSurvey || 0), 0) / orgMetrics.length;
      const avgCostPerArea = orgMetrics.reduce((sum, metric) => sum + (metric.costPerArea || 0), 0) / orgMetrics.length;

      // Get active drones count
      const activeDrones = await this.prisma.drone.count({
        where: {
          site: {
            orgId: orgId
          },
          status: {
            in: ['AVAILABLE', 'IN_MISSION']
          }
        }
      });

      // Generate trend data
      const trendsData: TrendPoint[] = orgMetrics.map((metric, index) => ({
        date: metric.date,
        value: metric.totalSurveys,
        metric: 'surveys',
        change: index > 0 ? ((metric.totalSurveys - orgMetrics[index - 1].totalSurveys) / orgMetrics[index - 1].totalSurveys) * 100 : 0
      }));

      // Generate seasonal patterns (simplified)
      const seasonalPatterns: SeasonalData[] = this.generateSeasonalPatterns(orgMetrics);

      const metrics: OrgMetrics = {
        orgId,
        totalSurveys,
        totalAreaCovered,
        totalFlightTime,
        activeDrones,
        costPerSurvey: avgCostPerSurvey,
        costPerArea: avgCostPerArea,
        averageEfficiency: avgEfficiency,
        successRate: avgSuccessRate,
        trendsData,
        seasonalPatterns,
        timeRange
      };

      return validateOrgMetrics(metrics);
    } catch (error) {
      logger.error('Error fetching organization metrics', { error, orgId });
      throw error;
    }
  }

  // Site Analytics Methods

  /**
   * Get site-specific metrics
   */
  async getSiteMetrics(siteId: string, timeRange: TimeRange): Promise<SiteMetrics> {
    try {
      logger.info('Fetching site metrics', { siteId, timeRange });

      const [siteMetrics, site] = await Promise.all([
        this.prisma.siteMetrics.findMany({
          where: {
            siteId: siteId,
            date: {
              gte: timeRange.start,
              lte: timeRange.end
            }
          },
          orderBy: { date: 'asc' }
        }),
        this.prisma.site.findUnique({
          where: { id: siteId }
        })
      ]);

      if (!site) {
        throw new Error(`Site not found: ${siteId}`);
      }

      if (siteMetrics.length === 0) {
        throw new Error(`No site metrics found for site ${siteId}`);
      }

      // Aggregate metrics
      const totalSurveys = siteMetrics.reduce((sum, metric) => sum + metric.totalSurveys, 0);
      const totalAreaCovered = siteMetrics.reduce((sum, metric) => sum + metric.totalAreaCovered, 0);
      const totalFlightTime = siteMetrics.reduce((sum, metric) => sum + metric.totalFlightTime, 0);
      
      const avgEfficiency = siteMetrics.reduce((sum, metric) => sum + (metric.averageEfficiency || 0), 0) / siteMetrics.length;
      const avgSuccessRate = siteMetrics.reduce((sum, metric) => sum + (metric.successRate || 0), 0) / siteMetrics.length;
      const avgUtilizationRate = siteMetrics.reduce((sum, metric) => sum + (metric.utilizationRate || 0), 0) / siteMetrics.length;
      const avgBenchmarkScore = siteMetrics.reduce((sum, metric) => sum + (metric.benchmarkScore || 0), 0) / siteMetrics.length;

      const totalWeatherDelays = siteMetrics.reduce((sum, metric) => sum + metric.weatherDelays, 0);
      const totalMaintenanceDowntime = siteMetrics.reduce((sum, metric) => sum + metric.maintenanceDowntime, 0);

      // Get active drones count
      const activeDrones = await this.prisma.drone.count({
        where: {
          siteId: siteId,
          status: {
            in: ['AVAILABLE', 'IN_MISSION']
          }
        }
      });

      // Get performance rank (simplified - could be more sophisticated)
      const performanceRank = siteMetrics.length > 0 ? siteMetrics[siteMetrics.length - 1].performanceRank : null;

      const metrics: SiteMetrics = {
        siteId,
        siteName: site.name,
        totalSurveys,
        totalAreaCovered,
        totalFlightTime,
        activeDrones,
        averageEfficiency: avgEfficiency,
        successRate: avgSuccessRate,
        weatherDelays: totalWeatherDelays,
        maintenanceDowntime: totalMaintenanceDowntime,
        utilizationRate: avgUtilizationRate,
        performanceRank: performanceRank || undefined,
        benchmarkScore: avgBenchmarkScore,
        timeRange
      };

      return validateSiteMetrics(metrics);
    } catch (error) {
      logger.error('Error fetching site metrics', { error, siteId });
      throw error;
    }
  }

  // Coverage Analysis Methods

  /**
   * Get coverage analysis for a mission
   */
  async getCoverageAnalysis(missionId: string): Promise<CoverageAnalysis> {
    try {
      logger.info('Fetching coverage analysis', { missionId });

      const coverageAnalysis = await this.prisma.coverageAnalysis.findFirst({
        where: {
          missionAnalytics: {
            missionId: missionId
          }
        },
        include: {
          missionAnalytics: true
        }
      });

      if (!coverageAnalysis) {
        throw new Error(`Coverage analysis not found for mission ${missionId}`);
      }

      const analysis: CoverageAnalysis = {
        missionId,
        plannedArea: coverageAnalysis.plannedArea,
        actualCoverage: coverageAnalysis.actualCoverage,
        coveragePercentage: coverageAnalysis.coveragePercentage,
        gapAreas: coverageAnalysis.gapAreas as any || [],
        overlapAreas: coverageAnalysis.overlapAreas as any || [],
        overlapEfficiency: coverageAnalysis.overlapEfficiency || 0,
        patternCompliance: coverageAnalysis.patternCompliance || 0,
        qualityScore: coverageAnalysis.qualityScore,
        recommendations: coverageAnalysis.recommendations as any || [],
        industryStandards: coverageAnalysis.industryStandards as any || []
      };

      return validateCoverageAnalysis(analysis);
    } catch (error) {
      logger.error('Error fetching coverage analysis', { error, missionId });
      throw error;
    }
  }

  // Helper Methods

  private calculateUtilizationRate(flightTimeMinutes: number, timeRange: TimeRange): number {
    const daysDiff = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const maxPossibleMinutes = daysDiff * 8 * 60; // 8 hours per day
    return Math.min(100, (flightTimeMinutes / maxPossibleMinutes) * 100);
  }

  private async getMaintenanceAlerts(siteId: string): Promise<MaintenanceAlert[]> {
    const alerts = await this.prisma.performanceAlerts.findMany({
      where: {
        entityType: 'DRONE',
        alertType: {
          in: ['MAINTENANCE_DUE', 'BATTERY_ISSUE']
        },
        isResolved: false,
        entityId: {
          in: await this.prisma.drone.findMany({
            where: { siteId },
            select: { id: true }
          }).then(drones => drones.map(d => d.id))
        }
      }
    });

    return alerts.map(alert => ({
      droneId: alert.entityId,
      alertType: alert.alertType === 'MAINTENANCE_DUE' ? 'due' as const : 'recommended' as const,
      severity: alert.severity === 'CRITICAL' ? 'high' as const : 
                alert.severity === 'WARNING' ? 'medium' as const : 'low' as const,
      message: alert.message,
      dueDate: new Date(alert.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from creation
      estimatedDowntime: 240, // 4 hours in minutes
      maintenanceType: alert.alertType === 'BATTERY_ISSUE' ? 'battery' : 'routine'
    }));
  }

  private async getPerformanceScores(siteId: string): Promise<PerformanceScore[]> {
    const drones = await this.prisma.drone.findMany({
      where: { siteId },
      include: {
        fleetMetrics: {
          orderBy: { date: 'desc' },
          take: 7 // Last 7 days
        }
      }
    });

    return drones.map(drone => {
      const recentScores = drone.fleetMetrics
        .map(m => m.performanceScore)
        .filter(score => score !== null) as number[];
      
      const avgScore = recentScores.length > 0 
        ? recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length 
        : 0;

      return {
        droneId: drone.id,
        score: avgScore,
        factors: [
          { name: 'Mission Success Rate', weight: 0.3, score: avgScore, description: 'Percentage of successful missions' },
          { name: 'Utilization Rate', weight: 0.25, score: avgScore, description: 'Drone usage efficiency' },
          { name: 'Maintenance History', weight: 0.25, score: avgScore, description: 'Maintenance frequency and issues' },
          { name: 'Flight Performance', weight: 0.2, score: avgScore, description: 'Flight quality and efficiency' }
        ],
        trend: recentScores.length >= 2 && recentScores[0] > recentScores[recentScores.length - 1] ? 'improving' as const :
               recentScores.length >= 2 && recentScores[0] < recentScores[recentScores.length - 1] ? 'declining' as const :
               'stable' as const,
        lastUpdated: new Date()
      };
    });
  }

  private generateSeasonalPatterns(metrics: any[]): SeasonalData[] {
    // Simplified seasonal pattern generation
    const monthlyData = new Map<string, number[]>();
    
    for (const metric of metrics) {
      const month = metric.date.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData.has(month)) {
        monthlyData.set(month, []);
      }
      monthlyData.get(month)!.push(metric.totalSurveys);
    }

    return Array.from(monthlyData.entries()).map(([period, values]) => {
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
      
      return {
        period,
        value: values[values.length - 1], // Latest value
        average,
        variance
      };
    });
  }

  private generateBatteryUsageData(metrics: MissionMetrics): any[] {
    // Generate sample battery usage data based on mission duration
    const points = [];
    const duration = metrics.duration;
    const consumption = metrics.batteryConsumption;
    
    for (let i = 0; i <= duration; i += 5) { // Every 5 minutes
      const percentage = i / duration;
      const batteryLevel = 100 - (consumption * percentage);
      const consumptionRate = consumption / duration; // Per minute
      
      points.push({
        timestamp: new Date(Date.now() + i * 60 * 1000),
        batteryLevel: Math.max(0, batteryLevel),
        consumption: consumptionRate
      });
    }
    
    return points;
  }

  private generateMissionRecommendations(metrics: MissionMetrics, coverage: CoverageAnalysis): string[] {
    const recommendations = [];

    if (metrics.coverageEfficiency < 85) {
      recommendations.push('Consider increasing overlap percentage to improve coverage efficiency');
    }

    if (metrics.batteryConsumption > 80) {
      recommendations.push('Monitor battery usage - consider shorter missions or battery replacement');
    }

    if (coverage.overlapEfficiency < 80) {
      recommendations.push('Optimize flight pattern to reduce excessive overlap and improve efficiency');
    }

    if (metrics.qualityScore < 75) {
      recommendations.push('Review flight parameters and weather conditions to improve data quality');
    }

    if (coverage.gapAreas.length > 0) {
      recommendations.push('Plan additional flights to cover identified gap areas');
    }

    return recommendations;
  }

  // Additional Coverage Analysis Helper Methods

  private calculatePolygonArea(polygon: any): number {
    // Simplified area calculation - in production would use turf.js or similar
    // Returns area in square kilometers
    if (!polygon || !polygon.coordinates || !polygon.coordinates[0]) {
      return 0;
    }

    const coords = polygon.coordinates[0];
    if (coords.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < coords.length - 1; i++) {
      area += coords[i][0] * coords[i + 1][1];
      area -= coords[i + 1][0] * coords[i][1];
    }
    area = Math.abs(area / 2);

    // Convert from degrees to km² (rough approximation)
    // 1 degree ≈ 111 km at equator
    return area * 111 * 111 / 1000000;
  }

  private identifyGapAreas(surveyArea: any, coveragePercentage: number): any[] {
    // Simplified gap identification
    // In production would analyze actual flight path vs planned area
    const gaps = [];
    
    if (coveragePercentage < 95) {
      const uncoveredPercentage = 100 - coveragePercentage;
      gaps.push({
        type: 'Polygon',
        coordinates: [], // Would contain actual gap polygon coordinates
        area: this.calculatePolygonArea(surveyArea) * (uncoveredPercentage / 100),
        description: `${uncoveredPercentage.toFixed(1)}% of planned area not covered`
      });
    }

    return gaps;
  }

  private identifyOverlapAreas(flightPathData: any): any[] {
    // Simplified overlap identification
    // In production would analyze actual flight path overlaps
    return [];
  }

  private calculateOverlapEfficiency(overlapAreas: any[], totalCoverage: number): number {
    // Ideal overlap is 20-30%
    const totalOverlap = overlapAreas.reduce((sum, area) => sum + (area.area || 0), 0);
    const overlapPercentage = totalCoverage > 0 ? (totalOverlap / totalCoverage) * 100 : 0;
    
    if (overlapPercentage >= 20 && overlapPercentage <= 30) return 100;
    if (overlapPercentage < 20) return (overlapPercentage / 20) * 100;
    return Math.max(0, 100 - (overlapPercentage - 30) * 2);
  }

  private checkPatternCompliance(pattern: string, flightPathData: any, parameters: any): number {
    // Simplified pattern compliance check
    // In production would verify actual flight path against planned pattern
    if (!flightPathData || !Array.isArray(flightPathData) || flightPathData.length < 10) {
      return 0;
    }

    // Check altitude consistency
    const altitudes = flightPathData.map((p: any) => p.altitude).filter((a: any) => a !== undefined);
    if (altitudes.length === 0) return 50;

    const avgAltitude = altitudes.reduce((sum: number, alt: number) => sum + alt, 0) / altitudes.length;
    const altitudeVariance = altitudes.reduce((sum: number, alt: number) => sum + Math.pow(alt - avgAltitude, 2), 0) / altitudes.length;
    const altitudeScore = Math.max(0, 100 - Math.sqrt(altitudeVariance));

    // Check speed consistency
    const speeds = flightPathData.map((p: any) => p.speed).filter((s: any) => s !== undefined);
    if (speeds.length === 0) return altitudeScore;

    const avgSpeed = speeds.reduce((sum: number, spd: number) => sum + spd, 0) / speeds.length;
    const speedVariance = speeds.reduce((sum: number, spd: number) => sum + Math.pow(spd - avgSpeed, 2), 0) / speeds.length;
    const speedScore = Math.max(0, 100 - Math.sqrt(speedVariance) * 10);

    return (altitudeScore + speedScore) / 2;
  }

  private calculateCoverageQualityScore(params: {
    coveragePercentage: number;
    overlapEfficiency: number;
    patternCompliance: number;
    gapCount: number;
  }): number {
    let score = 0;

    // Coverage percentage (40% weight)
    score += Math.min(params.coveragePercentage, 100) * 0.4;

    // Overlap efficiency (25% weight)
    score += params.overlapEfficiency * 0.25;

    // Pattern compliance (25% weight)
    score += params.patternCompliance * 0.25;

    // Gap penalty (10% weight)
    const gapPenalty = Math.max(0, 10 - params.gapCount * 2);
    score += gapPenalty;

    return Math.min(Math.max(score, 0), 100);
  }

  private generateCoverageRecommendations(params: {
    coveragePercentage: number;
    gapAreas: any[];
    overlapEfficiency: number;
    patternCompliance: number;
  }): string[] {
    const recommendations: string[] = [];

    if (params.coveragePercentage < 95) {
      recommendations.push(`Coverage is ${params.coveragePercentage.toFixed(1)}% - consider re-flying gap areas`);
    }

    if (params.gapAreas.length > 0) {
      recommendations.push(`${params.gapAreas.length} gap area(s) detected - review flight plan for next mission`);
    }

    if (params.overlapEfficiency < 80) {
      recommendations.push('Overlap efficiency is low - adjust overlap settings for better coverage');
    }

    if (params.patternCompliance < 80) {
      recommendations.push('Flight pattern deviation detected - check autopilot settings');
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent coverage quality - no improvements needed');
    }

    return recommendations;
  }

  private checkIndustryStandards(params: {
    coveragePercentage: number;
    overlapEfficiency: number;
    patternCompliance: number;
  }): any[] {
    return [
      {
        standard: 'ISO 21384',
        requirement: 'Minimum 95% coverage',
        compliance: params.coveragePercentage >= 95,
        score: Math.min((params.coveragePercentage / 95) * 100, 100),
        recommendation: params.coveragePercentage < 95 ? 'Increase coverage to meet standard' : undefined
      },
      {
        standard: 'Survey Best Practices',
        requirement: '20-30% overlap',
        compliance: params.overlapEfficiency >= 80,
        score: params.overlapEfficiency,
        recommendation: params.overlapEfficiency < 80 ? 'Optimize overlap settings' : undefined
      },
      {
        standard: 'Flight Pattern Compliance',
        requirement: 'Consistent pattern execution',
        compliance: params.patternCompliance >= 85,
        score: params.patternCompliance,
        recommendation: params.patternCompliance < 85 ? 'Review autopilot configuration' : undefined
      }
    ];
  }

  private mapToCoverageAnalysis(analysis: any, missionId: string): CoverageAnalysis {
    return {
      missionId,
      plannedArea: analysis.plannedArea,
      actualCoverage: analysis.actualCoverage,
      coveragePercentage: analysis.coveragePercentage,
      gapAreas: analysis.gapAreas || [],
      overlapAreas: analysis.overlapAreas || [],
      overlapEfficiency: analysis.overlapEfficiency || 0,
      patternCompliance: analysis.patternCompliance || 0,
      qualityScore: analysis.qualityScore,
      recommendations: analysis.recommendations || [],
      industryStandards: analysis.industryStandards || []
    };
  }
}