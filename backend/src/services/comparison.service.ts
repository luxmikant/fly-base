/**
 * Site Comparison Service
 * Advanced site comparison and benchmarking system
 */

import { prisma } from '../lib/database';
import { logger } from '../lib/logger';

export interface SitePerformanceMetrics {
  siteId: string;
  siteName: string;
  location: {
    latitude: number;
    longitude: number;
    region: string;
  };
  metrics: {
    totalSurveys: number;
    totalFlightTime: number;
    averageEfficiency: number;
    successRate: number;
    costPerSurvey: number;
    utilizationRate: number;
    maintenanceFrequency: number;
    averageMissionDuration: number;
    coverageQuality: number;
  };
  trends: {
    efficiencyTrend: number; // percentage change
    costTrend: number;
    utilizationTrend: number;
  };
  ranking: {
    overall: number;
    efficiency: number;
    cost: number;
    utilization: number;
  };
  benchmarks: {
    industryAverage: number;
    topPerformer: number;
    percentile: number;
  };
}

export interface ComparisonAnalysis {
  sites: SitePerformanceMetrics[];
  summary: {
    totalSites: number;
    bestPerformer: string;
    worstPerformer: string;
    averageEfficiency: number;
    efficiencyRange: { min: number; max: number };
    costRange: { min: number; max: number };
  };
  recommendations: Array<{
    siteId: string;
    type: 'efficiency' | 'cost' | 'utilization' | 'maintenance';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
  }>;
  outliers: Array<{
    siteId: string;
    metric: string;
    value: number;
    deviation: number;
    reason: string;
  }>;
}

export interface BenchmarkData {
  metric: string;
  industryStandards: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  organizationAverage: number;
  bestSiteValue: number;
  worstSiteValue: number;
}

export class ComparisonService {
  /**
   * Compare multiple sites performance
   */
  async compareSites(
    siteIds: string[],
    orgId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<ComparisonAnalysis> {
    try {
      // Get site performance metrics
      const siteMetrics = await Promise.all(
        siteIds.map(siteId => this.getSiteMetrics(siteId, orgId, timeRange))
      );

      // Calculate rankings
      const rankedSites = this.calculateRankings(siteMetrics);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(rankedSites);

      // Identify outliers
      const outliers = this.identifyOutliers(rankedSites);

      // Calculate summary statistics
      const summary = this.calculateSummary(rankedSites);

      return {
        sites: rankedSites,
        summary,
        recommendations,
        outliers,
      };

    } catch (error) {
      logger.error('Error comparing sites', { error, siteIds, orgId });
      throw new Error('Failed to compare sites');
    }
  }

  /**
   * Get benchmark data for metrics
   */
  async getBenchmarkData(
    orgId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<BenchmarkData[]> {
    try {
      const metrics = [
        'efficiency',
        'costPerSurvey',
        'utilizationRate',
        'successRate',
        'maintenanceFrequency',
      ];

      const benchmarks: BenchmarkData[] = [];

      for (const metric of metrics) {
        const benchmark = await this.calculateBenchmark(metric, orgId, timeRange);
        benchmarks.push(benchmark);
      }

      return benchmarks;

    } catch (error) {
      logger.error('Error getting benchmark data', { error, orgId });
      throw new Error('Failed to get benchmark data');
    }
  }

  /**
   * Rank sites based on multiple criteria
   */
  async rankSites(
    orgId: string,
    criteria: {
      efficiency: number;
      cost: number;
      utilization: number;
      maintenance: number;
    },
    timeRange: { start: Date; end: Date }
  ): Promise<Array<{ siteId: string; score: number; rank: number }>> {
    try {
      // Get all sites for organization
      const sites = await prisma.site.findMany({
        where: { orgId },
        select: { id: true, name: true },
      });

      const siteScores: Array<{ siteId: string; score: number }> = [];

      for (const site of sites) {
        const metrics = await this.getSiteMetrics(site.id, orgId, timeRange);
        const score = this.calculateCompositeScore(metrics, criteria);
        siteScores.push({ siteId: site.id, score });
      }

      // Sort by score (descending) and assign ranks
      siteScores.sort((a, b) => b.score - a.score);
      
      return siteScores.map((site, index) => ({
        ...site,
        rank: index + 1,
      }));

    } catch (error) {
      logger.error('Error ranking sites', { error, orgId });
      throw new Error('Failed to rank sites');
    }
  }

  /**
   * Get detailed site performance metrics
   */
  private async getSiteMetrics(
    siteId: string,
    orgId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<SitePerformanceMetrics> {
    try {
      // Get site information
      const site = await prisma.site.findUnique({
        where: { id: siteId },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          region: true,
        },
      });

      if (!site) {
        throw new Error(`Site ${siteId} not found`);
      }

      // Get site metrics from database
      const siteMetrics = await prisma.siteMetrics.findMany({
        where: {
          siteId,
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (siteMetrics.length === 0) {
        // Return default metrics if no data
        return this.getDefaultSiteMetrics(site);
      }

      // Calculate aggregated metrics
      const totalSurveys = siteMetrics.reduce((sum, m) => sum + (m.totalSurveys || 0), 0);
      const totalFlightTime = siteMetrics.reduce((sum, m) => sum + (m.totalFlightTime || 0), 0);
      const averageEfficiency = siteMetrics.reduce((sum, m) => sum + (m.averageEfficiency || 0), 0) / siteMetrics.length;
      const successRate = siteMetrics.reduce((sum, m) => sum + (m.successRate || 0), 0) / siteMetrics.length;
      const costPerSurvey = siteMetrics.reduce((sum, m) => sum + (m.averageCostPerSurvey || 0), 0) / siteMetrics.length;
      const utilizationRate = siteMetrics.reduce((sum, m) => sum + (m.utilizationRate || 0), 0) / siteMetrics.length;

      // Calculate trends (compare first half vs second half of period)
      const midpoint = Math.floor(siteMetrics.length / 2);
      const recentMetrics = siteMetrics.slice(0, midpoint);
      const olderMetrics = siteMetrics.slice(midpoint);

      const recentEfficiency = recentMetrics.reduce((sum, m) => sum + (m.averageEfficiency || 0), 0) / recentMetrics.length;
      const olderEfficiency = olderMetrics.reduce((sum, m) => sum + (m.averageEfficiency || 0), 0) / olderMetrics.length;
      const efficiencyTrend = olderEfficiency > 0 ? ((recentEfficiency - olderEfficiency) / olderEfficiency) * 100 : 0;

      const recentCost = recentMetrics.reduce((sum, m) => sum + (m.averageCostPerSurvey || 0), 0) / recentMetrics.length;
      const olderCost = olderMetrics.reduce((sum, m) => sum + (m.averageCostPerSurvey || 0), 0) / olderMetrics.length;
      const costTrend = olderCost > 0 ? ((recentCost - olderCost) / olderCost) * 100 : 0;

      const recentUtilization = recentMetrics.reduce((sum, m) => sum + (m.utilizationRate || 0), 0) / recentMetrics.length;
      const olderUtilization = olderMetrics.reduce((sum, m) => sum + (m.utilizationRate || 0), 0) / olderMetrics.length;
      const utilizationTrend = olderUtilization > 0 ? ((recentUtilization - olderUtilization) / olderUtilization) * 100 : 0;

      return {
        siteId: site.id,
        siteName: site.name,
        location: {
          latitude: site.latitude || 0,
          longitude: site.longitude || 0,
          region: site.region || 'Unknown',
        },
        metrics: {
          totalSurveys,
          totalFlightTime,
          averageEfficiency,
          successRate,
          costPerSurvey,
          utilizationRate,
          maintenanceFrequency: 0.1, // Placeholder
          averageMissionDuration: totalFlightTime / Math.max(1, totalSurveys),
          coverageQuality: averageEfficiency, // Simplified
        },
        trends: {
          efficiencyTrend,
          costTrend,
          utilizationTrend,
        },
        ranking: {
          overall: 0, // Will be calculated later
          efficiency: 0,
          cost: 0,
          utilization: 0,
        },
        benchmarks: {
          industryAverage: 75, // Placeholder
          topPerformer: 95,
          percentile: 0, // Will be calculated
        },
      };

    } catch (error) {
      logger.error('Error getting site metrics', { error, siteId });
      throw error;
    }
  }

  /**
   * Calculate rankings for sites
   */
  private calculateRankings(sites: SitePerformanceMetrics[]): SitePerformanceMetrics[] {
    const rankedSites = [...sites];

    // Rank by efficiency
    const efficiencyRanked = [...sites].sort((a, b) => b.metrics.averageEfficiency - a.metrics.averageEfficiency);
    efficiencyRanked.forEach((site, index) => {
      const siteIndex = rankedSites.findIndex(s => s.siteId === site.siteId);
      rankedSites[siteIndex].ranking.efficiency = index + 1;
    });

    // Rank by cost (lower is better)
    const costRanked = [...sites].sort((a, b) => a.metrics.costPerSurvey - b.metrics.costPerSurvey);
    costRanked.forEach((site, index) => {
      const siteIndex = rankedSites.findIndex(s => s.siteId === site.siteId);
      rankedSites[siteIndex].ranking.cost = index + 1;
    });

    // Rank by utilization
    const utilizationRanked = [...sites].sort((a, b) => b.metrics.utilizationRate - a.metrics.utilizationRate);
    utilizationRanked.forEach((site, index) => {
      const siteIndex = rankedSites.findIndex(s => s.siteId === site.siteId);
      rankedSites[siteIndex].ranking.utilization = index + 1;
    });

    // Calculate overall ranking (composite score)
    rankedSites.forEach(site => {
      const compositeScore = (
        site.metrics.averageEfficiency * 0.3 +
        (100 - (site.metrics.costPerSurvey / 1000) * 100) * 0.3 + // Normalize cost
        site.metrics.utilizationRate * 100 * 0.2 +
        site.metrics.successRate * 0.2
      );
      site.ranking.overall = compositeScore;
    });

    // Sort by overall score and assign ranks
    rankedSites.sort((a, b) => b.ranking.overall - a.ranking.overall);
    rankedSites.forEach((site, index) => {
      site.ranking.overall = index + 1;
    });

    return rankedSites;
  }

  /**
   * Generate recommendations for site improvements
   */
  private async generateRecommendations(
    sites: SitePerformanceMetrics[]
  ): Promise<Array<{
    siteId: string;
    type: 'efficiency' | 'cost' | 'utilization' | 'maintenance';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: string;
  }>> {
    const recommendations: Array<{
      siteId: string;
      type: 'efficiency' | 'cost' | 'utilization' | 'maintenance';
      priority: 'high' | 'medium' | 'low';
      description: string;
      expectedImpact: string;
    }> = [];

    for (const site of sites) {
      // Efficiency recommendations
      if (site.metrics.averageEfficiency < 70) {
        recommendations.push({
          siteId: site.siteId,
          type: 'efficiency',
          priority: 'high',
          description: 'Mission efficiency is below acceptable threshold. Review flight planning and execution procedures.',
          expectedImpact: 'Potential 15-25% improvement in mission efficiency',
        });
      }

      // Cost recommendations
      if (site.metrics.costPerSurvey > 400) {
        recommendations.push({
          siteId: site.siteId,
          type: 'cost',
          priority: 'medium',
          description: 'Cost per survey is above industry average. Consider optimizing resource allocation and maintenance schedules.',
          expectedImpact: 'Potential 10-20% reduction in operational costs',
        });
      }

      // Utilization recommendations
      if (site.metrics.utilizationRate < 0.6) {
        recommendations.push({
          siteId: site.siteId,
          type: 'utilization',
          priority: 'medium',
          description: 'Fleet utilization is low. Consider redistributing drones or increasing mission frequency.',
          expectedImpact: 'Potential 20-30% increase in fleet utilization',
        });
      }

      // Maintenance recommendations
      if (site.metrics.maintenanceFrequency > 0.2) {
        recommendations.push({
          siteId: site.siteId,
          type: 'maintenance',
          priority: 'high',
          description: 'High maintenance frequency detected. Review operational procedures and environmental factors.',
          expectedImpact: 'Potential 25-40% reduction in maintenance costs',
        });
      }
    }

    return recommendations;
  }

  /**
   * Identify statistical outliers
   */
  private identifyOutliers(sites: SitePerformanceMetrics[]): Array<{
    siteId: string;
    metric: string;
    value: number;
    deviation: number;
    reason: string;
  }> {
    const outliers: Array<{
      siteId: string;
      metric: string;
      value: number;
      deviation: number;
      reason: string;
    }> = [];

    const metrics = ['averageEfficiency', 'costPerSurvey', 'utilizationRate'];

    for (const metric of metrics) {
      const values = sites.map(s => (s.metrics as any)[metric]);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

      for (const site of sites) {
        const value = (site.metrics as any)[metric];
        const deviation = Math.abs(value - mean) / stdDev;

        if (deviation > 2) { // More than 2 standard deviations
          outliers.push({
            siteId: site.siteId,
            metric,
            value,
            deviation,
            reason: deviation > 3 ? 'Extreme outlier' : 'Statistical outlier',
          });
        }
      }
    }

    return outliers;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(sites: SitePerformanceMetrics[]): {
    totalSites: number;
    bestPerformer: string;
    worstPerformer: string;
    averageEfficiency: number;
    efficiencyRange: { min: number; max: number };
    costRange: { min: number; max: number };
  } {
    const efficiencies = sites.map(s => s.metrics.averageEfficiency);
    const costs = sites.map(s => s.metrics.costPerSurvey);

    const bestPerformer = sites.reduce((best, site) => 
      site.ranking.overall < best.ranking.overall ? site : best
    );

    const worstPerformer = sites.reduce((worst, site) => 
      site.ranking.overall > worst.ranking.overall ? site : worst
    );

    return {
      totalSites: sites.length,
      bestPerformer: bestPerformer.siteName,
      worstPerformer: worstPerformer.siteName,
      averageEfficiency: efficiencies.reduce((sum, e) => sum + e, 0) / efficiencies.length,
      efficiencyRange: {
        min: Math.min(...efficiencies),
        max: Math.max(...efficiencies),
      },
      costRange: {
        min: Math.min(...costs),
        max: Math.max(...costs),
      },
    };
  }

  /**
   * Calculate benchmark for a specific metric
   */
  private async calculateBenchmark(
    metric: string,
    orgId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<BenchmarkData> {
    // Industry standards (placeholder - would come from external data)
    const industryStandards = {
      efficiency: { excellent: 95, good: 85, average: 75, poor: 60 },
      costPerSurvey: { excellent: 200, good: 300, average: 400, poor: 500 },
      utilizationRate: { excellent: 0.9, good: 0.8, average: 0.7, poor: 0.6 },
      successRate: { excellent: 98, good: 95, average: 90, poor: 85 },
      maintenanceFrequency: { excellent: 0.05, good: 0.1, average: 0.15, poor: 0.2 },
    };

    // Get organization data
    const orgMetrics = await prisma.organizationMetrics.findMany({
      where: {
        orgId,
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
    });

    let organizationAverage = 0;
    let bestSiteValue = 0;
    let worstSiteValue = 0;

    if (orgMetrics.length > 0) {
      switch (metric) {
        case 'efficiency':
          organizationAverage = orgMetrics.reduce((sum, m) => sum + (m.averageEfficiency || 0), 0) / orgMetrics.length;
          bestSiteValue = Math.max(...orgMetrics.map(m => m.averageEfficiency || 0));
          worstSiteValue = Math.min(...orgMetrics.map(m => m.averageEfficiency || 0));
          break;
        case 'costPerSurvey':
          organizationAverage = orgMetrics.reduce((sum, m) => sum + (m.averageCostPerSurvey || 0), 0) / orgMetrics.length;
          bestSiteValue = Math.min(...orgMetrics.map(m => m.averageCostPerSurvey || 0));
          worstSiteValue = Math.max(...orgMetrics.map(m => m.averageCostPerSurvey || 0));
          break;
        // Add other metrics as needed
      }
    }

    return {
      metric,
      industryStandards: (industryStandards as any)[metric] || { excellent: 100, good: 80, average: 60, poor: 40 },
      organizationAverage,
      bestSiteValue,
      worstSiteValue,
    };
  }

  /**
   * Calculate composite score for ranking
   */
  private calculateCompositeScore(
    metrics: SitePerformanceMetrics,
    criteria: {
      efficiency: number;
      cost: number;
      utilization: number;
      maintenance: number;
    }
  ): number {
    const normalizedEfficiency = metrics.metrics.averageEfficiency / 100;
    const normalizedCost = Math.max(0, 1 - (metrics.metrics.costPerSurvey / 1000)); // Normalize to 0-1, lower cost is better
    const normalizedUtilization = metrics.metrics.utilizationRate;
    const normalizedMaintenance = Math.max(0, 1 - metrics.metrics.maintenanceFrequency); // Lower frequency is better

    return (
      normalizedEfficiency * criteria.efficiency +
      normalizedCost * criteria.cost +
      normalizedUtilization * criteria.utilization +
      normalizedMaintenance * criteria.maintenance
    ) / (criteria.efficiency + criteria.cost + criteria.utilization + criteria.maintenance);
  }

  /**
   * Get default metrics for sites with no data
   */
  private getDefaultSiteMetrics(site: any): SitePerformanceMetrics {
    return {
      siteId: site.id,
      siteName: site.name,
      location: {
        latitude: site.latitude || 0,
        longitude: site.longitude || 0,
        region: site.region || 'Unknown',
      },
      metrics: {
        totalSurveys: 0,
        totalFlightTime: 0,
        averageEfficiency: 0,
        successRate: 0,
        costPerSurvey: 0,
        utilizationRate: 0,
        maintenanceFrequency: 0,
        averageMissionDuration: 0,
        coverageQuality: 0,
      },
      trends: {
        efficiencyTrend: 0,
        costTrend: 0,
        utilizationTrend: 0,
      },
      ranking: {
        overall: 0,
        efficiency: 0,
        cost: 0,
        utilization: 0,
      },
      benchmarks: {
        industryAverage: 75,
        topPerformer: 95,
        percentile: 0,
      },
    };
  }
}

export const comparisonService = new ComparisonService();