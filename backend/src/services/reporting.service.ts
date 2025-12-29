/**
 * Reporting and Export Service
 * Comprehensive reporting system with PDF, CSV, and JSON export capabilities
 * Supports executive summaries, mission reports, and custom report generation
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../lib/logger';
import { AnalyticsService } from './analytics.service';
import {
  MissionMetrics,
  FleetUtilization,
  OrgMetrics,
  SiteMetrics,
  ExecutiveReport,
  MissionReport,
  TimeRange,
  SiteComparisonData,
  FleetOverviewData,
  TrendAnalysis,
  ExecutiveRecommendation
} from '../types/analytics.types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Report format types
 */
export type ReportFormat = 'pdf' | 'csv' | 'json' | 'html';

/**
 * Report type categories
 */
export type ReportType = 
  | 'mission' 
  | 'fleet' 
  | 'organization' 
  | 'site' 
  | 'executive' 
  | 'comparison'
  | 'custom';

/**
 * Report options configuration
 */
export interface ReportOptions {
  format: ReportFormat;
  includeSummary?: boolean;
  includeCharts?: boolean;
  includeRecommendations?: boolean;
  includeRawData?: boolean;
  fileName?: string;
  templateId?: string;
}

/**
 * Custom report configuration
 */
export interface CustomReportConfig {
  title: string;
  description?: string;
  sections: ReportSection[];
  filters?: ReportFilters;
  timeRange: TimeRange;
  format: ReportFormat;
}

/**
 * Report section configuration
 */
export interface ReportSection {
  id: string;
  title: string;
  type: 'metrics' | 'chart' | 'table' | 'text' | 'recommendations';
  dataSource: string;
  columns?: string[];
  chartType?: 'line' | 'bar' | 'pie' | 'area';
  content?: string;
}

/**
 * Report filters
 */
export interface ReportFilters {
  siteIds?: string[];
  droneIds?: string[];
  missionStatuses?: string[];
  minQualityScore?: number;
  maxQualityScore?: number;
}

/**
 * Generated report metadata
 */
export interface GeneratedReport {
  id: string;
  type: ReportType;
  format: ReportFormat;
  fileName: string;
  filePath: string;
  fileSize: number;
  generatedAt: Date;
  metadata: {
    title: string;
    author: string;
    organizationId?: string;
    siteId?: string;
    timeRange?: TimeRange;
  };
}

export class ReportingService {
  private prisma: PrismaClient;
  private analyticsService: AnalyticsService;
  private reportsDirectory: string;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.analyticsService = new AnalyticsService(prisma);
    this.reportsDirectory = path.join(process.cwd(), 'reports');
    this.ensureReportsDirectory();
  }

  // ========================================
  // MISSION REPORTS
  // ========================================

  /**
   * Generate comprehensive mission report in specified format
   */
  async generateMissionReport(
    missionId: string,
    options: ReportOptions = { format: 'json' }
  ): Promise<GeneratedReport> {
    try {
      logger.info('Generating mission report', { missionId, format: options.format });

      // Get mission data and analytics
      const missionReport = await this.analyticsService.generateMissionReport(missionId);
      const mission = await this.prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          site: true,
          organization: true,
          drone: true
        }
      });

      if (!mission) {
        throw new Error(`Mission not found: ${missionId}`);
      }

      const reportData = {
        ...missionReport,
        metadata: {
          organizationName: mission.organization.name,
          siteName: mission.site.name,
          droneSerial: mission.drone.serialNumber
        }
      };

      // Generate based on format
      let filePath: string;
      let fileName: string;

      switch (options.format) {
        case 'json':
          fileName = options.fileName || `mission_${missionId}_${Date.now()}.json`;
          filePath = await this.exportToJSON(reportData, fileName);
          break;

        case 'csv':
          fileName = options.fileName || `mission_${missionId}_${Date.now()}.csv`;
          filePath = await this.exportMissionToCSV(reportData, fileName);
          break;

        case 'html':
          fileName = options.fileName || `mission_${missionId}_${Date.now()}.html`;
          filePath = await this.exportMissionToHTML(reportData, fileName, options);
          break;

        case 'pdf':
          fileName = options.fileName || `mission_${missionId}_${Date.now()}.pdf`;
          filePath = await this.exportToPDF(reportData, fileName, 'mission', options);
          break;

        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      const stats = fs.statSync(filePath);

      const generatedReport: GeneratedReport = {
        id: `report_${Date.now()}`,
        type: 'mission',
        format: options.format,
        fileName,
        filePath,
        fileSize: stats.size,
        generatedAt: new Date(),
        metadata: {
          title: `Mission Report: ${mission.name}`,
          author: 'Analytics Service',
          organizationId: mission.orgId,
          siteId: mission.siteId
        }
      };

      logger.info('Mission report generated successfully', { 
        reportId: generatedReport.id,
        fileName: generatedReport.fileName,
        fileSize: generatedReport.fileSize 
      });

      return generatedReport;
    } catch (error) {
      logger.error('Error generating mission report', { error, missionId });
      throw error;
    }
  }

  // ========================================
  // EXECUTIVE SUMMARY
  // ========================================

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(
    orgId: string,
    timeRange: TimeRange,
    options: ReportOptions = { format: 'pdf' }
  ): Promise<GeneratedReport> {
    try {
      logger.info('Generating executive summary', { orgId, timeRange, format: options.format });

      // Get organization data
      const organization = await this.prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          sites: {
            include: {
              drones: true
            }
          }
        }
      });

      if (!organization) {
        throw new Error(`Organization not found: ${orgId}`);
      }

      // Get comprehensive analytics
      const [orgMetrics, sites] = await Promise.all([
        this.analyticsService.getOrganizationMetrics(orgId, timeRange),
        this.getSiteComparisons(orgId, timeRange)
      ]);

      // Get fleet overview
      const fleetOverview = await this.getFleetOverview(orgId, timeRange);

      // Generate trend analysis
      const trends = this.analyzeTrends(orgMetrics);

      // Generate recommendations
      const recommendations = this.generateExecutiveRecommendations(
        orgMetrics,
        sites,
        fleetOverview
      );

      const executiveReport: ExecutiveReport = {
        organization: {
          id: organization.id,
          name: organization.name
        },
        period: timeRange,
        summary: orgMetrics,
        siteComparison: sites,
        fleetOverview,
        trends,
        recommendations,
        generatedAt: new Date()
      };

      // Export based on format
      let filePath: string;
      let fileName: string;

      switch (options.format) {
        case 'json':
          fileName = options.fileName || `executive_summary_${orgId}_${Date.now()}.json`;
          filePath = await this.exportToJSON(executiveReport, fileName);
          break;

        case 'html':
          fileName = options.fileName || `executive_summary_${orgId}_${Date.now()}.html`;
          filePath = await this.exportExecutiveToHTML(executiveReport, fileName, options);
          break;

        case 'pdf':
          fileName = options.fileName || `executive_summary_${orgId}_${Date.now()}.pdf`;
          filePath = await this.exportToPDF(executiveReport, fileName, 'executive', options);
          break;

        default:
          throw new Error(`Unsupported format for executive summary: ${options.format}`);
      }

      const stats = fs.statSync(filePath);

      const generatedReport: GeneratedReport = {
        id: `exec_report_${Date.now()}`,
        type: 'executive',
        format: options.format,
        fileName,
        filePath,
        fileSize: stats.size,
        generatedAt: new Date(),
        metadata: {
          title: `Executive Summary: ${organization.name}`,
          author: 'Analytics Service',
          organizationId: orgId,
          timeRange
        }
      };

      logger.info('Executive summary generated successfully', { 
        reportId: generatedReport.id,
        fileName: generatedReport.fileName 
      });

      return generatedReport;
    } catch (error) {
      logger.error('Error generating executive summary', { error, orgId });
      throw error;
    }
  }

  // ========================================
  // CUSTOM REPORTS
  // ========================================

  /**
   * Generate custom report based on configuration
   */
  async generateCustomReport(
    config: CustomReportConfig,
    userId: string
  ): Promise<GeneratedReport> {
    try {
      logger.info('Generating custom report', { 
        title: config.title,
        format: config.format,
        userId 
      });

      // Collect data for each section
      const sectionsData = await Promise.all(
        config.sections.map(section => this.fetchSectionData(section, config))
      );

      const customReport = {
        title: config.title,
        description: config.description,
        timeRange: config.timeRange,
        sections: config.sections.map((section, index) => ({
          ...section,
          data: sectionsData[index]
        })),
        filters: config.filters,
        generatedAt: new Date(),
        generatedBy: userId
      };

      // Export based on format
      let filePath: string;
      const sanitizedTitle = config.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      let fileName: string;

      switch (config.format) {
        case 'json':
          fileName = `custom_${sanitizedTitle}_${Date.now()}.json`;
          filePath = await this.exportToJSON(customReport, fileName);
          break;

        case 'csv':
          fileName = `custom_${sanitizedTitle}_${Date.now()}.csv`;
          filePath = await this.exportCustomToCSV(customReport, fileName);
          break;

        case 'html':
          fileName = `custom_${sanitizedTitle}_${Date.now()}.html`;
          filePath = await this.exportCustomToHTML(customReport, fileName);
          break;

        case 'pdf':
          fileName = `custom_${sanitizedTitle}_${Date.now()}.pdf`;
          filePath = await this.exportToPDF(customReport, fileName, 'custom');
          break;

        default:
          throw new Error(`Unsupported format: ${config.format}`);
      }

      const stats = fs.statSync(filePath);

      const generatedReport: GeneratedReport = {
        id: `custom_report_${Date.now()}`,
        type: 'custom',
        format: config.format,
        fileName,
        filePath,
        fileSize: stats.size,
        generatedAt: new Date(),
        metadata: {
          title: config.title,
          author: userId,
          timeRange: config.timeRange
        }
      };

      logger.info('Custom report generated successfully', { 
        reportId: generatedReport.id,
        fileName: generatedReport.fileName 
      });

      return generatedReport;
    } catch (error) {
      logger.error('Error generating custom report', { error, config });
      throw error;
    }
  }

  // ========================================
  // FLEET REPORTS
  // ========================================

  /**
   * Generate fleet utilization report
   */
  async generateFleetReport(
    siteId: string,
    timeRange: TimeRange,
    options: ReportOptions = { format: 'json' }
  ): Promise<GeneratedReport> {
    try {
      logger.info('Generating fleet report', { siteId, timeRange });

      const [fleetUtil, site, anomalies] = await Promise.all([
        this.analyticsService.getFleetUtilization(siteId, timeRange),
        this.prisma.site.findUnique({ 
          where: { id: siteId },
          include: { organization: true }
        }),
        this.analyticsService.identifyPerformanceAnomalies(siteId)
      ]);

      if (!site) {
        throw new Error(`Site not found: ${siteId}`);
      }

      const fleetReport = {
        site: {
          id: site.id,
          name: site.name,
          organization: site.organization.name
        },
        timeRange,
        utilization: fleetUtil,
        anomalies: anomalies.filter(a => a.severity === 'critical' || a.severity === 'high'),
        summary: {
          totalDrones: fleetUtil.utilizationByDrone.length,
          avgPerformance: fleetUtil.utilizationByDrone.reduce((sum, d) => sum + d.performanceScore, 0) / fleetUtil.utilizationByDrone.length,
          totalFlightHours: fleetUtil.totalFlightHours,
          successRate: fleetUtil.fleetSuccessRate
        },
        generatedAt: new Date()
      };

      // Export based on format
      let filePath: string;
      let fileName: string;

      switch (options.format) {
        case 'json':
          fileName = `fleet_${siteId}_${Date.now()}.json`;
          filePath = await this.exportToJSON(fleetReport, fileName);
          break;

        case 'csv':
          fileName = `fleet_${siteId}_${Date.now()}.csv`;
          filePath = await this.exportFleetToCSV(fleetReport, fileName);
          break;

        case 'html':
          fileName = `fleet_${siteId}_${Date.now()}.html`;
          filePath = await this.exportFleetToHTML(fleetReport, fileName, options);
          break;

        case 'pdf':
          fileName = `fleet_${siteId}_${Date.now()}.pdf`;
          filePath = await this.exportToPDF(fleetReport, fileName, 'fleet', options);
          break;

        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      const stats = fs.statSync(filePath);

      return {
        id: `fleet_report_${Date.now()}`,
        type: 'fleet',
        format: options.format,
        fileName,
        filePath,
        fileSize: stats.size,
        generatedAt: new Date(),
        metadata: {
          title: `Fleet Report: ${site.name}`,
          author: 'Analytics Service',
          organizationId: site.orgId,
          siteId: site.id,
          timeRange
        }
      };
    } catch (error) {
      logger.error('Error generating fleet report', { error, siteId });
      throw error;
    }
  }

  // ========================================
  // EXPORT METHODS - JSON
  // ========================================

  /**
   * Export any data to JSON format
   */
  private async exportToJSON(data: any, fileName: string): Promise<string> {
    const filePath = path.join(this.reportsDirectory, fileName);
    const jsonContent = JSON.stringify(data, null, 2);
    
    fs.writeFileSync(filePath, jsonContent, 'utf8');
    logger.debug('JSON export completed', { fileName, size: jsonContent.length });
    
    return filePath;
  }

  // ========================================
  // EXPORT METHODS - CSV
  // ========================================

  /**
   * Export mission report to CSV format
   */
  private async exportMissionToCSV(report: MissionReport, fileName: string): Promise<string> {
    const filePath = path.join(this.reportsDirectory, fileName);
    
    const csvLines: string[] = [];
    
    // Header
    csvLines.push('Mission Report');
    csvLines.push('');
    
    // Mission Info
    csvLines.push('Mission Information');
    csvLines.push(`Name,${this.escapeCSV(report.mission.name)}`);
    csvLines.push(`Status,${report.mission.status}`);
    csvLines.push(`Scheduled Start,${report.mission.scheduledStart?.toISOString() || 'N/A'}`);
    csvLines.push(`Actual Start,${report.mission.actualStart?.toISOString() || 'N/A'}`);
    csvLines.push(`Actual End,${report.mission.actualEnd?.toISOString() || 'N/A'}`);
    csvLines.push('');
    
    // Performance Metrics
    csvLines.push('Performance Metrics');
    csvLines.push('Metric,Value,Unit');
    csvLines.push(`Duration,${report.performance.duration},minutes`);
    csvLines.push(`Distance Covered,${report.performance.distanceCovered.toFixed(2)},km`);
    csvLines.push(`Area Surveyed,${report.performance.areaSurveyed.toFixed(2)},km²`);
    csvLines.push(`Coverage Efficiency,${report.performance.coverageEfficiency.toFixed(2)},%`);
    csvLines.push(`Battery Consumption,${report.performance.batteryConsumption.toFixed(2)},%`);
    csvLines.push(`Average Speed,${report.performance.averageSpeed.toFixed(2)},m/s`);
    csvLines.push(`Quality Score,${report.performance.qualityScore.toFixed(2)},/100`);
    csvLines.push('');
    
    // Coverage Analysis
    csvLines.push('Coverage Analysis');
    csvLines.push(`Planned Area,${report.coverage.plannedArea.toFixed(2)},km²`);
    csvLines.push(`Actual Coverage,${report.coverage.actualCoverage.toFixed(2)},km²`);
    csvLines.push(`Coverage Percentage,${report.coverage.coveragePercentage.toFixed(2)},%`);
    csvLines.push(`Gap Areas,${report.coverage.gapAreas.length},count`);
    csvLines.push(`Overlap Efficiency,${report.coverage.overlapEfficiency.toFixed(2)},%`);
    csvLines.push(`Pattern Compliance,${report.coverage.patternCompliance.toFixed(2)},%`);
    csvLines.push('');
    
    // Recommendations
    if (report.recommendations.length > 0) {
      csvLines.push('Recommendations');
      report.recommendations.forEach((rec, index) => {
        csvLines.push(`${index + 1},${this.escapeCSV(rec)}`);
      });
    }
    
    const csvContent = csvLines.join('\n');
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    return filePath;
  }

  /**
   * Export fleet report to CSV format
   */
  private async exportFleetToCSV(report: any, fileName: string): Promise<string> {
    const filePath = path.join(this.reportsDirectory, fileName);
    
    const csvLines: string[] = [];
    
    // Header
    csvLines.push('Fleet Utilization Report');
    csvLines.push(`Site,${report.site.name}`);
    csvLines.push(`Organization,${report.site.organization}`);
    csvLines.push('');
    
    // Summary
    csvLines.push('Fleet Summary');
    csvLines.push('Metric,Value');
    csvLines.push(`Total Drones,${report.summary.totalDrones}`);
    csvLines.push(`Total Flight Hours,${report.summary.totalFlightHours.toFixed(2)}`);
    csvLines.push(`Average Performance,${report.summary.avgPerformance.toFixed(2)}`);
    csvLines.push(`Success Rate,${report.summary.successRate.toFixed(2)}%`);
    csvLines.push('');
    
    // Drone Details
    csvLines.push('Drone Utilization Details');
    csvLines.push('Serial Number,Model,Flight Time (min),Total Missions,Success Rate (%),Utilization (%),Performance Score');
    
    report.utilization.utilizationByDrone.forEach((drone: any) => {
      const successRate = drone.totalMissions > 0 
        ? ((drone.successfulMissions / drone.totalMissions) * 100).toFixed(2)
        : '0.00';
      
      csvLines.push([
        drone.serialNumber,
        drone.model,
        drone.totalFlightTime,
        drone.totalMissions,
        successRate,
        (drone.utilizationRate || 0).toFixed(2),
        drone.performanceScore.toFixed(2)
      ].join(','));
    });
    
    const csvContent = csvLines.join('\n');
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    return filePath;
  }

  /**
   * Export custom report to CSV format
   */
  private async exportCustomToCSV(report: any, fileName: string): Promise<string> {
    const filePath = path.join(this.reportsDirectory, fileName);
    
    const csvLines: string[] = [];
    csvLines.push(report.title);
    if (report.description) {
      csvLines.push(report.description);
    }
    csvLines.push('');
    
    // Export each section
    report.sections.forEach((section: any) => {
      csvLines.push(section.title);
      
      if (section.type === 'table' && Array.isArray(section.data)) {
        // Table data
        if (section.data.length > 0) {
          const headers = Object.keys(section.data[0]);
          csvLines.push(headers.join(','));
          
          section.data.forEach((row: any) => {
            const values = headers.map(h => this.escapeCSV(String(row[h] || '')));
            csvLines.push(values.join(','));
          });
        }
      } else if (section.type === 'metrics' && typeof section.data === 'object') {
        // Metrics data
        csvLines.push('Metric,Value');
        Object.entries(section.data).forEach(([key, value]) => {
          csvLines.push(`${key},${value}`);
        });
      }
      
      csvLines.push('');
    });
    
    const csvContent = csvLines.join('\n');
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    return filePath;
  }

  // ========================================
  // EXPORT METHODS - HTML
  // ========================================

  /**
   * Export mission report to HTML format
   */
  private async exportMissionToHTML(
    report: MissionReport,
    fileName: string,
    options: ReportOptions
  ): Promise<string> {
    const filePath = path.join(this.reportsDirectory, fileName);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mission Report: ${this.escapeHTML(report.mission.name)}</title>
    <style>
        ${this.getReportStyles()}
    </style>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>Mission Report</h1>
            <h2>${this.escapeHTML(report.mission.name)}</h2>
            <p class="generated-date">Generated: ${report.generatedAt.toLocaleString()}</p>
        </header>

        <section class="report-section">
            <h3>Mission Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <label>Status:</label>
                    <span class="badge status-${report.mission.status.toLowerCase()}">${report.mission.status}</span>
                </div>
                <div class="info-item">
                    <label>Scheduled Start:</label>
                    <span>${report.mission.scheduledStart?.toLocaleString() || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <label>Actual Start:</label>
                    <span>${report.mission.actualStart?.toLocaleString() || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <label>Actual End:</label>
                    <span>${report.mission.actualEnd?.toLocaleString() || 'N/A'}</span>
                </div>
            </div>
        </section>

        <section class="report-section">
            <h3>Performance Metrics</h3>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${report.performance.duration}</div>
                    <div class="metric-label">Minutes</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.performance.distanceCovered.toFixed(2)}</div>
                    <div class="metric-label">km Covered</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.performance.areaSurveyed.toFixed(2)}</div>
                    <div class="metric-label">km² Surveyed</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.performance.coverageEfficiency.toFixed(1)}%</div>
                    <div class="metric-label">Coverage Efficiency</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.performance.batteryConsumption.toFixed(1)}%</div>
                    <div class="metric-label">Battery Used</div>
                </div>
                <div class="metric-card ${this.getQualityClass(report.performance.qualityScore)}">
                    <div class="metric-value">${report.performance.qualityScore.toFixed(1)}/100</div>
                    <div class="metric-label">Quality Score</div>
                </div>
            </div>
        </section>

        <section class="report-section">
            <h3>Coverage Analysis</h3>
            <table class="data-table">
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                </tr>
                <tr>
                    <td>Planned Area</td>
                    <td>${report.coverage.plannedArea.toFixed(2)} km²</td>
                </tr>
                <tr>
                    <td>Actual Coverage</td>
                    <td>${report.coverage.actualCoverage.toFixed(2)} km²</td>
                </tr>
                <tr>
                    <td>Coverage Percentage</td>
                    <td>${report.coverage.coveragePercentage.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Gap Areas</td>
                    <td>${report.coverage.gapAreas.length}</td>
                </tr>
                <tr>
                    <td>Overlap Efficiency</td>
                    <td>${report.coverage.overlapEfficiency.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Pattern Compliance</td>
                    <td>${report.coverage.patternCompliance.toFixed(2)}%</td>
                </tr>
                <tr>
                    <td>Quality Score</td>
                    <td class="${this.getQualityClass(report.coverage.qualityScore)}">${report.coverage.qualityScore.toFixed(1)}/100</td>
                </tr>
            </table>
        </section>

        ${report.recommendations.length > 0 ? `
        <section class="report-section">
            <h3>Recommendations</h3>
            <ul class="recommendations-list">
                ${report.recommendations.map(rec => `<li>${this.escapeHTML(rec)}</li>`).join('')}
            </ul>
        </section>
        ` : ''}

        <footer class="report-footer">
            <p>Report generated by Drone Mission Analytics System</p>
        </footer>
    </div>
</body>
</html>
    `;
    
    fs.writeFileSync(filePath, html, 'utf8');
    return filePath;
  }

  /**
   * Export executive summary to HTML format
   */
  private async exportExecutiveToHTML(
    report: ExecutiveReport,
    fileName: string,
    options: ReportOptions
  ): Promise<string> {
    const filePath = path.join(this.reportsDirectory, fileName);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Summary: ${this.escapeHTML(report.organization.name)}</title>
    <style>
        ${this.getReportStyles()}
        .executive-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 8px;
            margin-bottom: 2rem;
        }
    </style>
</head>
<body>
    <div class="report-container">
        <header class="executive-header">
            <h1>Executive Summary</h1>
            <h2>${this.escapeHTML(report.organization.name)}</h2>
            <p>Period: ${report.period.start.toLocaleDateString()} - ${report.period.end.toLocaleDateString()}</p>
            <p class="generated-date">Generated: ${report.generatedAt.toLocaleString()}</p>
        </header>

        <section class="report-section">
            <h3>Organization Summary</h3>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${report.summary.totalSurveys}</div>
                    <div class="metric-label">Total Surveys</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.summary.totalAreaCovered.toFixed(2)}</div>
                    <div class="metric-label">km² Covered</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.summary.totalFlightTime.toFixed(1)}</div>
                    <div class="metric-label">Flight Hours</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.summary.activeDrones}</div>
                    <div class="metric-label">Active Drones</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.summary.averageEfficiency.toFixed(1)}%</div>
                    <div class="metric-label">Avg Efficiency</div>
                </div>
                <div class="metric-card ${this.getQualityClass(report.summary.successRate)}">
                    <div class="metric-value">${report.summary.successRate.toFixed(1)}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
            </div>
        </section>

        <section class="report-section">
            <h3>Fleet Overview</h3>
            <div class="info-grid">
                <div class="info-item">
                    <label>Total Drones:</label>
                    <span>${report.fleetOverview.totalDrones}</span>
                </div>
                <div class="info-item">
                    <label>Active Drones:</label>
                    <span>${report.fleetOverview.activeDrones}</span>
                </div>
                <div class="info-item">
                    <label>Utilization Rate:</label>
                    <span>${report.fleetOverview.utilizationRate.toFixed(1)}%</span>
                </div>
                <div class="info-item">
                    <label>Maintenance Due:</label>
                    <span>${report.fleetOverview.maintenanceDue}</span>
                </div>
            </div>
        </section>

        ${report.recommendations.length > 0 ? `
        <section class="report-section">
            <h3>Strategic Recommendations</h3>
            ${report.recommendations.map(rec => `
                <div class="recommendation-card priority-${rec.priority}">
                    <h4>${this.escapeHTML(rec.title)}</h4>
                    <p class="category">${rec.category.toUpperCase()}</p>
                    <p>${this.escapeHTML(rec.description)}</p>
                    <div class="rec-details">
                        <span><strong>Impact:</strong> ${this.escapeHTML(rec.expectedImpact)}</span>
                        <span><strong>Effort:</strong> ${rec.implementationEffort}</span>
                        <span><strong>Timeline:</strong> ${this.escapeHTML(rec.timeline)}</span>
                    </div>
                </div>
            `).join('')}
        </section>
        ` : ''}

        <footer class="report-footer">
            <p>Confidential Executive Report - Drone Mission Analytics System</p>
        </footer>
    </div>
</body>
</html>
    `;
    
    fs.writeFileSync(filePath, html, 'utf8');
    return filePath;
  }

  /**
   * Export fleet report to HTML format
   */
  private async exportFleetToHTML(
    report: any,
    fileName: string,
    options: ReportOptions
  ): Promise<string> {
    const filePath = path.join(this.reportsDirectory, fileName);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Fleet Report: ${this.escapeHTML(report.site.name)}</title>
    <style>${this.getReportStyles()}</style>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>Fleet Utilization Report</h1>
            <h2>${this.escapeHTML(report.site.name)}</h2>
            <p>${this.escapeHTML(report.site.organization)}</p>
        </header>
        
        <section class="report-section">
            <h3>Fleet Summary</h3>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${report.summary.totalDrones}</div>
                    <div class="metric-label">Total Drones</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.summary.totalFlightHours.toFixed(1)}</div>
                    <div class="metric-label">Flight Hours</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.summary.avgPerformance.toFixed(1)}</div>
                    <div class="metric-label">Avg Performance</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.summary.successRate.toFixed(1)}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
            </div>
        </section>
        
        <section class="report-section">
            <h3>Drone Details</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Serial Number</th>
                        <th>Model</th>
                        <th>Flight Time</th>
                        <th>Missions</th>
                        <th>Success Rate</th>
                        <th>Performance</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.utilization.utilizationByDrone.map((drone: any) => `
                        <tr>
                            <td>${this.escapeHTML(drone.serialNumber)}</td>
                            <td>${this.escapeHTML(drone.model)}</td>
                            <td>${drone.totalFlightTime} min</td>
                            <td>${drone.totalMissions}</td>
                            <td>${((drone.successfulMissions / (drone.totalMissions || 1)) * 100).toFixed(1)}%</td>
                            <td class="${this.getQualityClass(drone.performanceScore)}">${drone.performanceScore.toFixed(1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </section>
    </div>
</body>
</html>
    `;
    
    fs.writeFileSync(filePath, html, 'utf8');
    return filePath;
  }

  /**
   * Export custom report to HTML format
   */
  private async exportCustomToHTML(report: any, fileName: string): Promise<string> {
    const filePath = path.join(this.reportsDirectory, fileName);
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${this.escapeHTML(report.title)}</title>
    <style>${this.getReportStyles()}</style>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>${this.escapeHTML(report.title)}</h1>
            ${report.description ? `<p>${this.escapeHTML(report.description)}</p>` : ''}
        </header>
        
        ${report.sections.map((section: any) => `
            <section class="report-section">
                <h3>${this.escapeHTML(section.title)}</h3>
                ${this.renderSectionContent(section)}
            </section>
        `).join('')}
        
        <footer class="report-footer">
            <p>Generated: ${report.generatedAt.toLocaleString()}</p>
        </footer>
    </div>
</body>
</html>
    `;
    
    fs.writeFileSync(filePath, html, 'utf8');
    return filePath;
  }

  // ========================================
  // EXPORT METHODS - PDF
  // ========================================

  /**
   * Export report to PDF format
   * Note: This is a placeholder. In production, use puppeteer or similar
   */
  private async exportToPDF(
    data: any,
    fileName: string,
    type: ReportType,
    options?: ReportOptions
  ): Promise<string> {
    // Generate HTML first
    const htmlFileName = fileName.replace('.pdf', '.html');
    let htmlPath: string;

    switch (type) {
      case 'mission':
        htmlPath = await this.exportMissionToHTML(data, htmlFileName, options || { format: 'html' });
        break;
      case 'executive':
        htmlPath = await this.exportExecutiveToHTML(data, htmlFileName, options || { format: 'html' });
        break;
      case 'fleet':
        htmlPath = await this.exportFleetToHTML(data, htmlFileName, options || { format: 'html' });
        break;
      default:
        htmlPath = await this.exportCustomToHTML(data, htmlFileName);
    }

    // In production, convert HTML to PDF using puppeteer
    // For now, return HTML path with .pdf extension
    const pdfPath = htmlPath.replace('.html', '.pdf');
    
    // TODO: Implement actual PDF generation using puppeteer
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.goto(`file://${htmlPath}`);
    // await page.pdf({ path: pdfPath, format: 'A4' });
    // await browser.close();

    // For now, just copy HTML as PDF placeholder
    fs.copyFileSync(htmlPath, pdfPath);
    
    logger.warn('PDF generation not fully implemented - using HTML as placeholder', { fileName });
    
    return pdfPath;
  }

  // ========================================
  // HELPER METHODS
  // ========================================

  /**
   * Ensure reports directory exists
   */
  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.reportsDirectory)) {
      fs.mkdirSync(this.reportsDirectory, { recursive: true });
      logger.info('Reports directory created', { path: this.reportsDirectory });
    }
  }

  /**
   * Get site comparisons for executive report
   */
  private async getSiteComparisons(
    orgId: string,
    timeRange: TimeRange
  ): Promise<SiteComparisonData[]> {
    const sites = await this.prisma.site.findMany({
      where: { orgId }
    });

    const comparisons = await Promise.all(
      sites.map(async site => {
        const metrics = await this.analyticsService.getSiteMetrics(site.id, timeRange);
        
        return {
          site: {
            id: site.id,
            name: site.name
          },
          metrics,
          ranking: metrics.performanceRank || 0,
          benchmarkComparison: {
            vsOrganizationAverage: 0, // Calculate based on org metrics
            vsIndustryStandard: 0,
            strengths: [],
            improvements: []
          }
        };
      })
    );

    return comparisons.sort((a, b) => (b.metrics.benchmarkScore || 0) - (a.metrics.benchmarkScore || 0));
  }

  /**
   * Get fleet overview for executive report
   */
  private async getFleetOverview(
    orgId: string,
    timeRange: TimeRange
  ): Promise<FleetOverviewData> {
    const sites = await this.prisma.site.findMany({
      where: { orgId },
      include: { drones: true }
    });

    const totalDrones = sites.reduce((sum, site) => sum + site.drones.length, 0);
    const activeDrones = sites.reduce(
      (sum, site) => sum + site.drones.filter(d => d.status === 'AVAILABLE' || d.status === 'IN_MISSION').length,
      0
    );

    // Get fleet metrics
    const fleetMetrics = await this.prisma.fleetMetrics.findMany({
      where: {
        siteId: { in: sites.map(s => s.id) },
        date: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      }
    });

    const utilizationRate = fleetMetrics.length > 0
      ? fleetMetrics.reduce((sum, m) => sum + (m.utilizationRate || 0), 0) / fleetMetrics.length
      : 0;

    return {
      totalDrones,
      activeDrones,
      utilizationRate,
      maintenanceDue: 0, // TODO: Calculate from maintenance alerts
      performanceDistribution: {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0
      },
      topPerformers: [],
      underperformers: []
    };
  }

  /**
   * Analyze trends from organization metrics
   */
  private analyzeTrends(orgMetrics: OrgMetrics): TrendAnalysis {
    return {
      surveyVolume: {
        metric: 'surveys',
        data: orgMetrics.trendsData,
        trend: 'stable',
        changeRate: 0,
        confidence: 80
      },
      efficiency: {
        metric: 'efficiency',
        data: [],
        trend: 'stable',
        changeRate: 0,
        confidence: 75
      },
      costEffectiveness: {
        metric: 'cost',
        data: [],
        trend: 'stable',
        changeRate: 0,
        confidence: 70
      },
      seasonalPatterns: {
        pattern: 'monthly',
        data: orgMetrics.seasonalPatterns,
        peakPeriods: [],
        lowPeriods: []
      },
      projections: []
    };
  }

  /**
   * Generate executive recommendations
   */
  private generateExecutiveRecommendations(
    orgMetrics: OrgMetrics,
    sites: SiteComparisonData[],
    fleet: FleetOverviewData
  ): ExecutiveRecommendation[] {
    const recommendations: ExecutiveRecommendation[] = [];

    // Efficiency recommendation
    if (orgMetrics.averageEfficiency < 85) {
      recommendations.push({
        category: 'efficiency',
        priority: 'high',
        title: 'Improve Survey Coverage Efficiency',
        description: `Current average efficiency is ${orgMetrics.averageEfficiency.toFixed(1)}%. Target is 85%+.`,
        expectedImpact: 'Reduce mission time by 15-20% and improve data quality',
        implementationEffort: 'medium',
        timeline: '2-3 months'
      });
    }

    // Fleet utilization recommendation
    if (fleet.utilizationRate < 60) {
      recommendations.push({
        category: 'capacity',
        priority: 'medium',
        title: 'Optimize Fleet Utilization',
        description: `Fleet utilization at ${fleet.utilizationRate.toFixed(1)}% indicates underutilized capacity.`,
        expectedImpact: 'Increase operational efficiency and ROI by 25%',
        implementationEffort: 'low',
        timeline: '1-2 months'
      });
    }

    return recommendations;
  }

  /**
   * Fetch data for custom report section
   */
  private async fetchSectionData(section: ReportSection, config: CustomReportConfig): Promise<any> {
    // Placeholder implementation - would fetch actual data based on section config
    switch (section.dataSource) {
      case 'missions':
        return await this.prisma.mission.findMany({
          where: config.filters?.missionStatuses 
            ? { status: { in: config.filters.missionStatuses as any } }
            : undefined,
          take: 100
        });
      
      case 'drones':
        return await this.prisma.drone.findMany({
          where: config.filters?.droneIds 
            ? { id: { in: config.filters.droneIds } }
            : undefined
        });
      
      default:
        return [];
    }
  }

  /**
   * Render section content for HTML export
   */
  private renderSectionContent(section: any): string {
    if (section.type === 'table' && Array.isArray(section.data) && section.data.length > 0) {
      const headers = Object.keys(section.data[0]);
      return `
        <table class="data-table">
          <thead>
            <tr>${headers.map(h => `<th>${this.escapeHTML(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${section.data.map((row: any) => `
              <tr>${headers.map(h => `<td>${this.escapeHTML(String(row[h] || ''))}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (section.type === 'text') {
      return `<p>${this.escapeHTML(section.content || '')}</p>`;
    }
    return '<p>No data available</p>';
  }

  /**
   * Get report CSS styles
   */
  private getReportStyles(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
      .report-container { max-width: 1200px; margin: 2rem auto; background: white; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .report-header { text-align: center; padding-bottom: 2rem; border-bottom: 3px solid #4a90e2; margin-bottom: 2rem; }
      .report-header h1 { font-size: 2.5rem; color: #2c3e50; margin-bottom: 0.5rem; }
      .report-header h2 { font-size: 1.5rem; color: #7f8c8d; margin-bottom: 1rem; }
      .generated-date { color: #95a5a6; font-size: 0.9rem; }
      .report-section { margin-bottom: 2rem; }
      .report-section h3 { font-size: 1.5rem; color: #2c3e50; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #ecf0f1; }
      .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
      .metric-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 8px; text-align: center; }
      .metric-value { font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem; }
      .metric-label { font-size: 0.9rem; opacity: 0.9; }
      .metric-card.excellent { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
      .metric-card.good { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .metric-card.warning { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
      .metric-card.poor { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
      .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
      .info-item { padding: 0.75rem; background: #f8f9fa; border-left: 4px solid #4a90e2; }
      .info-item label { font-weight: 600; color: #2c3e50; display: inline-block; min-width: 120px; }
      .data-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
      .data-table th, .data-table td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #ecf0f1; }
      .data-table th { background: #34495e; color: white; font-weight: 600; }
      .data-table tr:hover { background: #f8f9fa; }
      .badge { padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; }
      .status-completed { background: #27ae60; color: white; }
      .status-in_progress { background: #3498db; color: white; }
      .status-failed { background: #e74c3c; color: white; }
      .recommendations-list { list-style: none; }
      .recommendations-list li { padding: 1rem; margin: 0.5rem 0; background: #e8f4fd; border-left: 4px solid #3498db; }
      .recommendation-card { padding: 1.5rem; margin: 1rem 0; background: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px; }
      .recommendation-card.priority-high { border-left-color: #e74c3c; background: #fef5f5; }
      .recommendation-card.priority-medium { border-left-color: #f39c12; background: #fef9f5; }
      .recommendation-card.priority-low { border-left-color: #27ae60; background: #f5fef8; }
      .recommendation-card h4 { color: #2c3e50; margin-bottom: 0.5rem; }
      .recommendation-card .category { color: #7f8c8d; font-size: 0.85rem; margin-bottom: 0.5rem; }
      .rec-details { margin-top: 1rem; display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.9rem; }
      .rec-details span { color: #555; }
      .report-footer { margin-top: 3rem; padding-top: 1rem; border-top: 2px solid #ecf0f1; text-align: center; color: #95a5a6; font-size: 0.9rem; }
      .excellent { color: #27ae60; font-weight: bold; }
      .good { color: #3498db; font-weight: bold; }
      .warning { color: #f39c12; font-weight: bold; }
      .poor { color: #e74c3c; font-weight: bold; }
      @media print { .report-container { box-shadow: none; } }
    `;
  }

  /**
   * Get quality class for styling
   */
  private getQualityClass(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'warning';
    return 'poor';
  }

  /**
   * Escape CSV values
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Escape HTML values
   */
  private escapeHTML(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
