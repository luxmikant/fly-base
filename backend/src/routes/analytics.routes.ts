/**
 * Analytics API Routes
 * RESTful endpoints for analytics data access
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from '../services/analytics.service';
import { ReportingService } from '../services/reporting.service';
import { predictionService } from '../services/prediction.service';
import { authenticate } from '../middleware/auth';
import { logger } from '../lib/logger';
import { TimeRange } from '../types/analytics.types';

const router = Router();
const prisma = new PrismaClient();
const analyticsService = new AnalyticsService(prisma);
const reportingService = new ReportingService(prisma);

// Apply authentication to all analytics routes
router.use(authenticate);

// ========================================
// MISSION ANALYTICS ENDPOINTS
// ========================================

/**
 * GET /api/v1/analytics/missions/:id
 * Get performance metrics for a specific mission
 */
router.get('/missions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    logger.info('Fetching mission analytics', { missionId: id });

    const metrics = await analyticsService.getMissionPerformanceMetrics(id);
    res.json({
      success: true,
      data: metrics
    });
  } catch (error: any) {
    logger.error('Error fetching mission analytics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/missions/:id/coverage
 * Get coverage analysis for a specific mission
 */
router.get('/missions/:id/coverage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    logger.info('Fetching mission coverage analysis', { missionId: id });

    const coverage = await analyticsService.getCoverageAnalysis(id);
    res.json({
      success: true,
      data: coverage
    });
  } catch (error: any) {
    logger.error('Error fetching coverage analysis', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/missions/:id/report
 * Generate comprehensive mission report
 */
router.get('/missions/:id/report', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    
    logger.info('Generating mission report', { missionId: id, format });

    const report = await reportingService.generateMissionReport(id, {
      format: format as any,
      includeSummary: true,
      includeRecommendations: true
    });

    if (format === 'json') {
      const reportData = await analyticsService.generateMissionReport(id);
      res.json({
        success: true,
        data: reportData
      });
    } else {
      res.json({
        success: true,
        data: {
          reportId: report.id,
          fileName: report.fileName,
          format: report.format,
          downloadUrl: `/api/v1/analytics/reports/${report.id}/download`
        }
      });
    }
  } catch (error: any) {
    logger.error('Error generating mission report', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// FLEET ANALYTICS ENDPOINTS
// ========================================

/**
 * GET /api/v1/analytics/fleet
 * Get fleet utilization metrics
 */
router.get('/fleet', async (req: Request, res: Response) => {
  try {
    const { siteId, startDate, endDate, granularity = 'day' } = req.query;
    
    if (!siteId) {
      return res.status(400).json({
        success: false,
        error: 'siteId is required'
      });
    }

    const timeRange: TimeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date(),
      granularity: granularity as any
    };

    logger.info('Fetching fleet utilization', { siteId, timeRange });

    const utilization = await analyticsService.getFleetUtilization(siteId as string, timeRange);
    res.json({
      success: true,
      data: utilization
    });
  } catch (error: any) {
    logger.error('Error fetching fleet utilization', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/fleet/anomalies
 * Get performance anomalies across the fleet
 */
router.get('/fleet/anomalies', async (req: Request, res: Response) => {
  try {
    const { siteId } = req.query;
    
    logger.info('Fetching fleet anomalies', { siteId });

    const anomalies = await analyticsService.identifyPerformanceAnomalies(siteId as string);
    res.json({
      success: true,
      data: anomalies
    });
  } catch (error: any) {
    logger.error('Error fetching fleet anomalies', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/fleet/maintenance/:droneId
 * Get maintenance schedule for a specific drone
 */
router.get('/fleet/maintenance/:droneId', async (req: Request, res: Response) => {
  try {
    const { droneId } = req.params;
    
    logger.info('Fetching maintenance schedule', { droneId });

    const schedule = await analyticsService.calculateMaintenanceSchedule(droneId);
    res.json({
      success: true,
      data: schedule
    });
  } catch (error: any) {
    logger.error('Error fetching maintenance schedule', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// ORGANIZATION ANALYTICS ENDPOINTS
// ========================================

/**
 * GET /api/v1/analytics/organization
 * Get organization-wide metrics
 */
router.get('/organization', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { startDate, endDate, granularity = 'day' } = req.query;

    const timeRange: TimeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date(),
      granularity: granularity as any
    };

    logger.info('Fetching organization metrics', { orgId: user.orgId, timeRange });

    const metrics = await analyticsService.getOrganizationMetrics(user.orgId, timeRange);
    res.json({
      success: true,
      data: metrics
    });
  } catch (error: any) {
    logger.error('Error fetching organization metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/organization/executive-summary
 * Generate executive summary report
 */
router.get('/organization/executive-summary', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { startDate, endDate, format = 'json' } = req.query;

    const timeRange: TimeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date(),
      granularity: 'day'
    };

    logger.info('Generating executive summary', { orgId: user.orgId, format });

    const report = await reportingService.generateExecutiveSummary(user.orgId, timeRange, {
      format: format as any,
      includeSummary: true,
      includeCharts: true,
      includeRecommendations: true
    });

    res.json({
      success: true,
      data: {
        reportId: report.id,
        fileName: report.fileName,
        format: report.format,
        downloadUrl: `/api/v1/analytics/reports/${report.id}/download`
      }
    });
  } catch (error: any) {
    logger.error('Error generating executive summary', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// SITE ANALYTICS ENDPOINTS
// ========================================

/**
 * GET /api/v1/analytics/sites/:id
 * Get metrics for a specific site
 */
router.get('/sites/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, granularity = 'day' } = req.query;

    const timeRange: TimeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date(),
      granularity: granularity as any
    };

    logger.info('Fetching site metrics', { siteId: id, timeRange });

    const metrics = await analyticsService.getSiteMetrics(id, timeRange);
    res.json({
      success: true,
      data: metrics
    });
  } catch (error: any) {
    logger.error('Error fetching site metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/analytics/sites/compare
 * Compare performance across multiple sites
 */
router.get('/sites/compare', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { siteIds, startDate, endDate, granularity = 'day' } = req.query;

    const timeRange: TimeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date(),
      granularity: granularity as any
    };

    // Get all sites for the organization if no specific sites provided
    let sitesToCompare: string[];
    if (siteIds) {
      sitesToCompare = (siteIds as string).split(',');
    } else {
      const sites = await prisma.site.findMany({
        where: { orgId: user.orgId },
        select: { id: true }
      });
      sitesToCompare = sites.map(s => s.id);
    }

    logger.info('Comparing sites', { siteIds: sitesToCompare, timeRange });

    // Get metrics for each site
    const siteMetrics = await Promise.all(
      sitesToCompare.map(async (siteId) => {
        try {
          return await analyticsService.getSiteMetrics(siteId, timeRange);
        } catch (error) {
          logger.warn('Failed to get metrics for site', { siteId, error });
          return null;
        }
      })
    );

    // Filter out failed requests and sort by benchmark score
    const validMetrics = siteMetrics.filter(m => m !== null);
    validMetrics.sort((a, b) => (b?.benchmarkScore || 0) - (a?.benchmarkScore || 0));

    // Add rankings
    const rankedMetrics = validMetrics.map((metrics, index) => ({
      ...metrics,
      rank: index + 1
    }));

    res.json({
      success: true,
      data: {
        sites: rankedMetrics,
        timeRange,
        totalSites: rankedMetrics.length
      }
    });
  } catch (error: any) {
    logger.error('Error comparing sites', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// TRENDS AND HISTORICAL DATA
// ========================================

/**
 * GET /api/v1/analytics/trends
 * Get trend data for specified metrics
 */
router.get('/trends', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { metric = 'surveys', startDate, endDate, granularity = 'day' } = req.query;

    const timeRange: TimeRange = {
      start: startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: endDate ? new Date(endDate as string) : new Date(),
      granularity: granularity as any
    };

    logger.info('Fetching trends', { metric, timeRange });

    const orgMetrics = await analyticsService.getOrganizationMetrics(user.orgId, timeRange);

    res.json({
      success: true,
      data: {
        metric,
        timeRange,
        trends: orgMetrics.trendsData,
        seasonalPatterns: orgMetrics.seasonalPatterns
      }
    });
  } catch (error: any) {
    logger.error('Error fetching trends', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// EXPORT ENDPOINTS
// ========================================

/**
 * POST /api/v1/analytics/export
 * Export analytics data in specified format
 */
router.post('/export', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { type, format = 'json', filters, timeRange: timeRangeInput } = req.body;

    const timeRange: TimeRange = {
      start: timeRangeInput?.start ? new Date(timeRangeInput.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: timeRangeInput?.end ? new Date(timeRangeInput.end) : new Date(),
      granularity: timeRangeInput?.granularity || 'day'
    };

    logger.info('Exporting analytics data', { type, format, filters });

    let report;
    switch (type) {
      case 'organization':
        report = await reportingService.generateExecutiveSummary(user.orgId, timeRange, {
          format,
          includeSummary: true,
          includeRecommendations: true
        });
        break;

      case 'fleet':
        if (!filters?.siteId) {
          return res.status(400).json({
            success: false,
            error: 'siteId is required for fleet export'
          });
        }
        report = await reportingService.generateFleetReport(filters.siteId, timeRange, {
          format,
          includeSummary: true
        });
        break;

      case 'mission':
        if (!filters?.missionId) {
          return res.status(400).json({
            success: false,
            error: 'missionId is required for mission export'
          });
        }
        report = await reportingService.generateMissionReport(filters.missionId, {
          format,
          includeSummary: true,
          includeRecommendations: true
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported export type: ${type}`
        });
    }

    res.json({
      success: true,
      data: {
        reportId: report.id,
        fileName: report.fileName,
        format: report.format,
        fileSize: report.fileSize,
        downloadUrl: `/api/v1/analytics/reports/${report.id}/download`
      }
    });
  } catch (error: any) {
    logger.error('Error exporting analytics data', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// DASHBOARD SUMMARY
// ========================================

/**
 * GET /api/v1/analytics/dashboard
 * Get dashboard summary data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const timeRange: TimeRange = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
      granularity: 'day'
    };

    logger.info('Fetching dashboard summary', { orgId: user.orgId });

    // Get organization metrics
    const orgMetrics = await analyticsService.getOrganizationMetrics(user.orgId, timeRange);

    // Get recent anomalies
    const anomalies = await analyticsService.identifyPerformanceAnomalies();

    // Get sites for the organization
    const sites = await prisma.site.findMany({
      where: { orgId: user.orgId },
      include: {
        drones: {
          select: { id: true, status: true }
        }
      }
    });

    // Calculate summary stats
    const totalDrones = sites.reduce((sum, site) => sum + site.drones.length, 0);
    const activeDrones = sites.reduce((sum, site) => 
      sum + site.drones.filter(d => d.status === 'AVAILABLE' || d.status === 'IN_MISSION').length, 0
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalSurveys: orgMetrics.totalSurveys,
          totalAreaCovered: orgMetrics.totalAreaCovered,
          totalFlightTime: orgMetrics.totalFlightTime,
          averageEfficiency: orgMetrics.averageEfficiency,
          successRate: orgMetrics.successRate,
          costPerSurvey: orgMetrics.costPerSurvey
        },
        fleet: {
          totalDrones,
          activeDrones,
          totalSites: sites.length
        },
        trends: orgMetrics.trendsData.slice(-7), // Last 7 data points
        anomalies: anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').slice(0, 5),
        timeRange
      }
    });
  } catch (error: any) {
    logger.error('Error fetching dashboard summary', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===== PREDICTION ENDPOINTS =====

/**
 * GET /api/v1/analytics/predictions/maintenance
 * Get maintenance predictions for drones
 */
router.get('/predictions/maintenance', async (req: Request, res: Response) => {
  try {
    const { droneId } = req.query;
    const orgId = req.user?.orgId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    const predictions = await predictionService.predictMaintenance(
      droneId as string,
      orgId
    );

    res.json({
      success: true,
      data: predictions,
      meta: {
        count: predictions.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting maintenance predictions', { error, user: req.user });
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance predictions'
    });
  }
});

/**
 * GET /api/v1/analytics/predictions/capacity
 * Get capacity forecasts
 */
router.get('/predictions/capacity', async (req: Request, res: Response) => {
  try {
    const { periods = '12' } = req.query;
    const orgId = req.user?.orgId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    const forecasts = await predictionService.forecastCapacity(
      orgId,
      parseInt(periods as string)
    );

    res.json({
      success: true,
      data: forecasts,
      meta: {
        periods: forecasts.length,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting capacity forecasts', { error, user: req.user });
    res.status(500).json({
      success: false,
      error: 'Failed to get capacity forecasts'
    });
  }
});

/**
 * GET /api/v1/analytics/predictions/trends
 * Analyze trends in performance metrics
 */
router.get('/predictions/trends/:metric', async (req: Request, res: Response) => {
  try {
    const { metric } = req.params;
    const { start, end } = req.query;
    const orgId = req.user?.orgId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    const timeRange = {
      start: start ? new Date(start as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end as string) : new Date()
    };

    const analysis = await predictionService.analyzeTrends(metric, orgId, timeRange);

    res.json({
      success: true,
      data: analysis,
      meta: {
        metric,
        timeRange,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error analyzing trends', { error, user: req.user, metric: req.params.metric });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze trends'
    });
  }
});

/**
 * GET /api/v1/analytics/predictions/alerts
 * Get performance alerts
 */
router.get('/predictions/alerts', async (req: Request, res: Response) => {
  try {
    const orgId = req.user?.orgId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      });
    }

    const alerts = await predictionService.generateAlerts(orgId);

    res.json({
      success: true,
      data: alerts,
      meta: {
        count: alerts.length,
        severity: {
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length,
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error generating alerts', { error, user: req.user });
    res.status(500).json({
      success: false,
      error: 'Failed to generate alerts'
    });
  }
});

export default router;