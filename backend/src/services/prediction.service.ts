/**
 * Prediction Service
 * Advanced analytics including predictions and anomaly detection
 */

import { prisma } from '../lib/database';
import { logger } from '../lib/logger';

export interface MaintenancePrediction {
  droneId: string;
  serialNumber: string;
  predictedMaintenanceDate: Date;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedActions: string[];
  basedOnMetrics: {
    flightHours: number;
    batteryDegradation: number;
    performanceScore: number;
    lastMaintenance: Date | null;
  };
}

export interface CapacityForecast {
  period: string;
  predictedDemand: number;
  currentCapacity: number;
  utilizationRate: number;
  recommendedFleetSize: number;
  confidence: number;
  factors: {
    seasonalTrend: number;
    historicalGrowth: number;
    marketFactors: number;
  };
}

export interface TrendAnalysis {
  metric: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  slope: number;
  correlation: number;
  seasonality: {
    detected: boolean;
    period?: number;
    amplitude?: number;
  };
  forecast: Array<{
    date: Date;
    value: number;
    confidence: number;
  }>;
}

export interface PerformanceAlert {
  id: string;
  type: 'maintenance' | 'performance' | 'efficiency' | 'safety';
  severity: 'low' | 'medium' | 'high' | 'critical';
  droneId?: string;
  siteId?: string;
  missionId?: string;
  title: string;
  description: string;
  recommendedAction: string;
  threshold: number;
  currentValue: number;
  createdAt: Date;
  resolvedAt?: Date;
}

export class PredictionService {
  /**
   * Predict maintenance needs for drones
   */
  async predictMaintenance(
    droneId?: string,
    orgId?: string
  ): Promise<MaintenancePrediction[]> {
    try {
      const whereClause = {
        ...(droneId && { droneId }),
        ...(orgId && { drone: { orgId } }),
      };

      // Get fleet metrics for analysis
      const fleetMetrics = await prisma.fleetMetrics.findMany({
        where: whereClause,
        include: {
          drone: {
            select: {
              id: true,
              serialNumber: true,
              model: true,
              lastMaintenanceDate: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 1000, // Last 1000 records for analysis
      });

      const predictions: MaintenancePrediction[] = [];

      // Group by drone
      const droneGroups = this.groupBy(fleetMetrics, 'droneId');

      for (const [droneId, metrics] of Object.entries(droneGroups)) {
        const drone = metrics[0].drone;
        const prediction = await this.calculateMaintenancePrediction(
          droneId,
          metrics,
          drone
        );
        predictions.push(prediction);
      }

      return predictions.sort((a, b) => a.predictedMaintenanceDate.getTime() - b.predictedMaintenanceDate.getTime());
    } catch (error) {
      logger.error('Error predicting maintenance', { error, droneId, orgId });
      throw new Error('Failed to predict maintenance');
    }
  }

  /**
   * Forecast capacity needs based on historical trends
   */
  async forecastCapacity(
    orgId: string,
    periods: number = 12
  ): Promise<CapacityForecast[]> {
    try {
      // Get historical organization metrics
      const orgMetrics = await prisma.organizationMetrics.findMany({
        where: { orgId },
        orderBy: { timestamp: 'desc' },
        take: 365, // Last year of data
      });

      if (orgMetrics.length < 30) {
        throw new Error('Insufficient historical data for forecasting');
      }

      const forecasts: CapacityForecast[] = [];
      const monthlyData = this.aggregateByMonth(orgMetrics);

      for (let i = 1; i <= periods; i++) {
        const forecast = await this.calculateCapacityForecast(
          monthlyData,
          i,
          orgId
        );
        forecasts.push(forecast);
      }

      return forecasts;
    } catch (error) {
      logger.error('Error forecasting capacity', { error, orgId });
      throw new Error('Failed to forecast capacity');
    }
  }

  /**
   * Analyze trends in performance metrics
   */
  async analyzeTrends(
    metric: string,
    orgId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<TrendAnalysis> {
    try {
      let data: Array<{ timestamp: Date; value: number }> = [];

      // Get data based on metric type
      switch (metric) {
        case 'efficiency':
          const missionData = await prisma.missionAnalytics.findMany({
            where: {
              mission: { orgId },
              timestamp: {
                gte: timeRange.start,
                lte: timeRange.end,
              },
            },
            select: { timestamp: true, efficiency: true },
          });
          data = missionData.map(d => ({ timestamp: d.timestamp, value: d.efficiency }));
          break;

        case 'utilization':
          const fleetData = await prisma.fleetMetrics.findMany({
            where: {
              drone: { orgId },
              timestamp: {
                gte: timeRange.start,
                lte: timeRange.end,
              },
            },
            select: { timestamp: true, utilizationRate: true },
          });
          data = fleetData.map(d => ({ timestamp: d.timestamp, value: d.utilizationRate }));
          break;

        case 'cost':
          const costData = await prisma.organizationMetrics.findMany({
            where: {
              orgId,
              timestamp: {
                gte: timeRange.start,
                lte: timeRange.end,
              },
            },
            select: { timestamp: true, averageCostPerSurvey: true },
          });
          data = costData.map(d => ({ timestamp: d.timestamp, value: d.averageCostPerSurvey }));
          break;

        default:
          throw new Error(`Unsupported metric: ${metric}`);
      }

      return this.performTrendAnalysis(data, metric);
    } catch (error) {
      logger.error('Error analyzing trends', { error, metric, orgId });
      throw new Error('Failed to analyze trends');
    }
  }

  /**
   * Generate performance alerts based on thresholds
   */
  async generateAlerts(orgId: string): Promise<PerformanceAlert[]> {
    try {
      const alerts: PerformanceAlert[] = [];

      // Check maintenance alerts
      const maintenanceAlerts = await this.checkMaintenanceAlerts(orgId);
      alerts.push(...maintenanceAlerts);

      // Check performance alerts
      const performanceAlerts = await this.checkPerformanceAlerts(orgId);
      alerts.push(...performanceAlerts);

      // Check efficiency alerts
      const efficiencyAlerts = await this.checkEfficiencyAlerts(orgId);
      alerts.push(...efficiencyAlerts);

      // Check safety alerts
      const safetyAlerts = await this.checkSafetyAlerts(orgId);
      alerts.push(...safetyAlerts);

      return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      logger.error('Error generating alerts', { error, orgId });
      throw new Error('Failed to generate alerts');
    }
  }

  /**
   * Calculate maintenance prediction for a specific drone
   */
  private async calculateMaintenancePrediction(
    droneId: string,
    metrics: any[],
    drone: any
  ): Promise<MaintenancePrediction> {
    const latestMetric = metrics[0];
    const flightHours = latestMetric.totalFlightTime || 0;
    const batteryDegradation = this.calculateBatteryDegradation(metrics);
    const performanceScore = this.calculatePerformanceScore(metrics);

    // Simple prediction algorithm (can be enhanced with ML)
    const hoursUntilMaintenance = this.predictMaintenanceHours(
      flightHours,
      batteryDegradation,
      performanceScore,
      drone.lastMaintenanceDate
    );

    const averageHoursPerDay = this.calculateAverageHoursPerDay(metrics);
    const daysUntilMaintenance = Math.ceil(hoursUntilMaintenance / averageHoursPerDay);
    
    const predictedDate = new Date();
    predictedDate.setDate(predictedDate.getDate() + daysUntilMaintenance);

    const riskLevel = this.calculateRiskLevel(
      hoursUntilMaintenance,
      batteryDegradation,
      performanceScore
    );

    return {
      droneId,
      serialNumber: drone.serialNumber,
      predictedMaintenanceDate: predictedDate,
      confidence: this.calculateConfidence(metrics.length, performanceScore),
      riskLevel,
      recommendedActions: this.getMaintenanceRecommendations(riskLevel, batteryDegradation),
      basedOnMetrics: {
        flightHours,
        batteryDegradation,
        performanceScore,
        lastMaintenance: drone.lastMaintenanceDate,
      },
    };
  }

  /**
   * Calculate capacity forecast for a specific period
   */
  private async calculateCapacityForecast(
    monthlyData: any[],
    monthsAhead: number,
    orgId: string
  ): Promise<CapacityForecast> {
    const currentCapacity = await this.getCurrentCapacity(orgId);
    const demandTrend = this.calculateDemandTrend(monthlyData);
    const seasonalFactor = this.calculateSeasonalFactor(monthlyData, monthsAhead);
    
    const predictedDemand = demandTrend.baseline * (1 + demandTrend.growth) ** monthsAhead * seasonalFactor;
    const utilizationRate = Math.min(predictedDemand / currentCapacity, 1.0);
    const recommendedFleetSize = Math.ceil(predictedDemand / 0.8); // Target 80% utilization

    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + monthsAhead);

    return {
      period: targetDate.toISOString().substring(0, 7), // YYYY-MM format
      predictedDemand,
      currentCapacity,
      utilizationRate,
      recommendedFleetSize,
      confidence: this.calculateForecastConfidence(monthlyData.length),
      factors: {
        seasonalTrend: seasonalFactor,
        historicalGrowth: demandTrend.growth,
        marketFactors: 1.0, // Placeholder for external factors
      },
    };
  }

  /**
   * Perform statistical trend analysis
   */
  private performTrendAnalysis(
    data: Array<{ timestamp: Date; value: number }>,
    metric: string
  ): TrendAnalysis {
    if (data.length < 10) {
      throw new Error('Insufficient data for trend analysis');
    }

    // Sort by timestamp
    data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Calculate linear regression
    const regression = this.calculateLinearRegression(data);
    const trend = this.determineTrend(regression.slope, regression.correlation);
    
    // Detect seasonality
    const seasonality = this.detectSeasonality(data);
    
    // Generate forecast
    const forecast = this.generateForecast(data, regression, 30); // 30 days ahead

    return {
      metric,
      trend,
      slope: regression.slope,
      correlation: regression.correlation,
      seasonality,
      forecast,
    };
  }

  // Helper methods
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private calculateBatteryDegradation(metrics: any[]): number {
    if (metrics.length < 2) return 0;
    
    const recent = metrics.slice(0, 10);
    const older = metrics.slice(-10);
    
    const recentAvg = recent.reduce((sum, m) => sum + (m.averageBatteryLevel || 100), 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + (m.averageBatteryLevel || 100), 0) / older.length;
    
    return Math.max(0, olderAvg - recentAvg);
  }

  private calculatePerformanceScore(metrics: any[]): number {
    if (metrics.length === 0) return 100;
    
    const recent = metrics.slice(0, 10);
    const avgEfficiency = recent.reduce((sum, m) => sum + (m.utilizationRate || 0), 0) / recent.length;
    
    return Math.min(100, avgEfficiency * 100);
  }

  private predictMaintenanceHours(
    currentHours: number,
    batteryDegradation: number,
    performanceScore: number,
    lastMaintenance: Date | null
  ): number {
    const baseMaintenanceInterval = 100; // hours
    const degradationFactor = 1 - (batteryDegradation / 100);
    const performanceFactor = performanceScore / 100;
    
    const adjustedInterval = baseMaintenanceInterval * degradationFactor * performanceFactor;
    
    if (lastMaintenance) {
      const hoursSinceMaintenance = this.calculateHoursSince(lastMaintenance);
      return Math.max(0, adjustedInterval - hoursSinceMaintenance);
    }
    
    return Math.max(0, adjustedInterval - (currentHours % baseMaintenanceInterval));
  }

  private calculateAverageHoursPerDay(metrics: any[]): number {
    if (metrics.length < 2) return 8; // Default 8 hours per day
    
    const totalHours = metrics.reduce((sum, m) => sum + (m.totalFlightTime || 0), 0);
    const daySpan = Math.max(1, (Date.now() - metrics[metrics.length - 1].timestamp.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(1, totalHours / daySpan);
  }

  private calculateRiskLevel(
    hoursUntilMaintenance: number,
    batteryDegradation: number,
    performanceScore: number
  ): 'low' | 'medium' | 'high' {
    if (hoursUntilMaintenance < 10 || batteryDegradation > 20 || performanceScore < 60) {
      return 'high';
    }
    if (hoursUntilMaintenance < 25 || batteryDegradation > 10 || performanceScore < 80) {
      return 'medium';
    }
    return 'low';
  }

  private calculateConfidence(dataPoints: number, performanceScore: number): number {
    const dataConfidence = Math.min(1, dataPoints / 100);
    const performanceConfidence = performanceScore / 100;
    return Math.round((dataConfidence * 0.6 + performanceConfidence * 0.4) * 100);
  }

  private getMaintenanceRecommendations(
    riskLevel: 'low' | 'medium' | 'high',
    batteryDegradation: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (riskLevel === 'high') {
      recommendations.push('Schedule immediate maintenance inspection');
      recommendations.push('Reduce flight operations until maintenance');
    }
    
    if (batteryDegradation > 15) {
      recommendations.push('Consider battery replacement');
    }
    
    if (riskLevel === 'medium') {
      recommendations.push('Schedule maintenance within 2 weeks');
      recommendations.push('Monitor performance closely');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue normal operations');
      recommendations.push('Monitor routine maintenance schedule');
    }
    
    return recommendations;
  }

  private async getCurrentCapacity(orgId: string): Promise<number> {
    const activeDrones = await prisma.drone.count({
      where: {
        orgId,
        status: { in: ['IDLE', 'ACTIVE'] },
      },
    });
    
    return activeDrones * 8; // Assume 8 hours per drone per day
  }

  private calculateDemandTrend(monthlyData: any[]): { baseline: number; growth: number } {
    if (monthlyData.length < 3) {
      return { baseline: 100, growth: 0 };
    }
    
    const values = monthlyData.map(d => d.totalSurveys || 0);
    const regression = this.calculateLinearRegression(
      values.map((v, i) => ({ timestamp: new Date(2024, i, 1), value: v }))
    );
    
    return {
      baseline: values[values.length - 1] || 100,
      growth: regression.slope / 100, // Convert to percentage
    };
  }

  private calculateSeasonalFactor(monthlyData: any[], monthsAhead: number): number {
    if (monthlyData.length < 12) return 1.0;
    
    const targetMonth = (new Date().getMonth() + monthsAhead) % 12;
    const historicalValues = monthlyData
      .filter((_, i) => i % 12 === targetMonth)
      .map(d => d.totalSurveys || 0);
    
    if (historicalValues.length === 0) return 1.0;
    
    const seasonalAvg = historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length;
    const overallAvg = monthlyData.reduce((sum, d) => sum + (d.totalSurveys || 0), 0) / monthlyData.length;
    
    return overallAvg > 0 ? seasonalAvg / overallAvg : 1.0;
  }

  private calculateForecastConfidence(dataPoints: number): number {
    return Math.min(95, Math.max(50, dataPoints * 2));
  }

  private aggregateByMonth(orgMetrics: any[]): any[] {
    const monthlyGroups: Record<string, any[]> = {};
    
    orgMetrics.forEach(metric => {
      const monthKey = metric.timestamp.toISOString().substring(0, 7);
      monthlyGroups[monthKey] = monthlyGroups[monthKey] || [];
      monthlyGroups[monthKey].push(metric);
    });
    
    return Object.entries(monthlyGroups).map(([month, metrics]) => ({
      month,
      totalSurveys: metrics.reduce((sum, m) => sum + (m.totalSurveys || 0), 0),
      totalFlightTime: metrics.reduce((sum, m) => sum + (m.totalFlightTime || 0), 0),
      averageEfficiency: metrics.reduce((sum, m) => sum + (m.averageEfficiency || 0), 0) / metrics.length,
    }));
  }

  private calculateLinearRegression(data: Array<{ timestamp: Date; value: number }>): {
    slope: number;
    intercept: number;
    correlation: number;
  } {
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const correlation = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return { slope, intercept, correlation: correlation || 0 };
  }

  private determineTrend(slope: number, correlation: number): 'increasing' | 'decreasing' | 'stable' | 'volatile' {
    if (Math.abs(correlation) < 0.3) return 'volatile';
    if (Math.abs(slope) < 0.01) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  }

  private detectSeasonality(data: Array<{ timestamp: Date; value: number }>): {
    detected: boolean;
    period?: number;
    amplitude?: number;
  } {
    if (data.length < 24) return { detected: false };
    
    // Simple seasonality detection (can be enhanced with FFT)
    const values = data.map(d => d.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    // Check for weekly (7-day) and monthly (30-day) patterns
    for (const period of [7, 30]) {
      if (data.length < period * 2) continue;
      
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < data.length - period; i++) {
        correlation += (values[i] - mean) * (values[i + period] - mean);
        count++;
      }
      
      correlation /= count;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      const normalizedCorrelation = correlation / variance;
      
      if (normalizedCorrelation > 0.3) {
        const amplitude = Math.sqrt(variance);
        return { detected: true, period, amplitude };
      }
    }
    
    return { detected: false };
  }

  private generateForecast(
    data: Array<{ timestamp: Date; value: number }>,
    regression: { slope: number; intercept: number },
    daysAhead: number
  ): Array<{ date: Date; value: number; confidence: number }> {
    const forecast: Array<{ date: Date; value: number; confidence: number }> = [];
    const lastDate = data[data.length - 1].timestamp;
    
    for (let i = 1; i <= daysAhead; i++) {
      const date = new Date(lastDate);
      date.setDate(date.getDate() + i);
      
      const x = data.length + i - 1;
      const value = regression.slope * x + regression.intercept;
      const confidence = Math.max(50, 95 - i * 2); // Decreasing confidence over time
      
      forecast.push({ date, value: Math.max(0, value), confidence });
    }
    
    return forecast;
  }

  private calculateHoursSince(date: Date): number {
    return (Date.now() - date.getTime()) / (1000 * 60 * 60);
  }

  // Alert generation methods
  private async checkMaintenanceAlerts(orgId: string): Promise<PerformanceAlert[]> {
    const predictions = await this.predictMaintenance(undefined, orgId);
    const alerts: PerformanceAlert[] = [];
    
    predictions.forEach(prediction => {
      if (prediction.riskLevel === 'high') {
        alerts.push({
          id: `maint-${prediction.droneId}-${Date.now()}`,
          type: 'maintenance',
          severity: 'high',
          droneId: prediction.droneId,
          title: 'Urgent Maintenance Required',
          description: `Drone ${prediction.serialNumber} requires immediate maintenance`,
          recommendedAction: prediction.recommendedActions[0],
          threshold: 10,
          currentValue: Math.round((prediction.predictedMaintenanceDate.getTime() - Date.now()) / (1000 * 60 * 60)),
          createdAt: new Date(),
        });
      }
    });
    
    return alerts;
  }

  private async checkPerformanceAlerts(orgId: string): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    
    // Check for low performance drones
    const lowPerformanceDrones = await prisma.fleetMetrics.findMany({
      where: {
        drone: { orgId },
        utilizationRate: { lt: 0.5 },
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: { drone: true },
    });
    
    lowPerformanceDrones.forEach(metric => {
      alerts.push({
        id: `perf-${metric.droneId}-${Date.now()}`,
        type: 'performance',
        severity: 'medium',
        droneId: metric.droneId,
        title: 'Low Performance Detected',
        description: `Drone ${metric.drone.serialNumber} showing low utilization`,
        recommendedAction: 'Investigate performance issues and optimize flight planning',
        threshold: 50,
        currentValue: Math.round(metric.utilizationRate * 100),
        createdAt: new Date(),
      });
    });
    
    return alerts;
  }

  private async checkEfficiencyAlerts(orgId: string): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    
    // Check for low efficiency missions
    const lowEfficiencyMissions = await prisma.missionAnalytics.findMany({
      where: {
        mission: { orgId },
        efficiency: { lt: 70 },
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { mission: true },
    });
    
    lowEfficiencyMissions.forEach(metric => {
      alerts.push({
        id: `eff-${metric.missionId}-${Date.now()}`,
        type: 'efficiency',
        severity: 'medium',
        missionId: metric.missionId,
        title: 'Low Mission Efficiency',
        description: `Mission efficiency below acceptable threshold`,
        recommendedAction: 'Review mission planning and execution parameters',
        threshold: 70,
        currentValue: Math.round(metric.efficiency),
        createdAt: new Date(),
      });
    });
    
    return alerts;
  }

  private async checkSafetyAlerts(orgId: string): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];
    
    // Check for safety incidents (placeholder - would integrate with actual safety data)
    const recentIncidents = await prisma.performanceAlerts.findMany({
      where: {
        orgId,
        type: 'SAFETY',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    
    if (recentIncidents.length > 0) {
      alerts.push({
        id: `safety-${orgId}-${Date.now()}`,
        type: 'safety',
        severity: 'critical',
        title: 'Safety Incidents Detected',
        description: `${recentIncidents.length} safety incidents reported in the last 24 hours`,
        recommendedAction: 'Review safety protocols and investigate incidents',
        threshold: 0,
        currentValue: recentIncidents.length,
        createdAt: new Date(),
      });
    }
    
    return alerts;
  }
}

export const predictionService = new PredictionService();