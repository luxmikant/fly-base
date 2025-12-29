# Reporting Service - Developer Guide

Complete guide to using the Reporting Service for generating and exporting analytics reports.

---

## 📚 Table of Contents

1. [Quick Start](#quick-start)
2. [Service Initialization](#service-initialization)
3. [Mission Reports](#mission-reports)
4. [Fleet Reports](#fleet-reports)
5. [Executive Summaries](#executive-summaries)
6. [Custom Reports](#custom-reports)
7. [Export Formats](#export-formats)
8. [Configuration Options](#configuration-options)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

---

## 🚀 Quick Start

### Basic Setup

```typescript
import { ReportingService } from './services/reporting.service';

// Initialize the service
const reportingService = new ReportingService();

// Generate a simple mission report
const report = await reportingService.generateMissionReport(
  'mission_123',
  { format: 'json' }
);

console.log(`Report generated: ${report.fileName}`);
console.log(`Location: ${report.filePath}`);
```

---

## ⚙️ Service Initialization

```typescript
import { ReportingService } from './services/reporting.service';

const reportingService = new ReportingService();
```

The service automatically:
- Creates the `backend/reports/` directory
- Integrates with Analytics Service
- Connects to Prisma database
- Sets up logging

---

## 📊 Mission Reports

### Generate Mission Report (JSON)

```typescript
const report = await reportingService.generateMissionReport(
  'mission_abc123',
  {
    format: 'json',
    includeSummary: true,
    includeRecommendations: true,
    includeRawData: false,
    fileName: 'custom_mission_report.json'
  }
);

console.log('Report Details:', {
  id: report.id,
  type: report.type,        // 'mission'
  format: report.format,    // 'json'
  fileName: report.fileName,
  fileSize: report.fileSize,
  generatedAt: report.generatedAt
});
```

### Generate Mission Report (CSV)

```typescript
const csvReport = await reportingService.generateMissionReport(
  'mission_xyz789',
  {
    format: 'csv',
    includeRecommendations: true
  }
);

// CSV contains:
// - Mission Information table
// - Performance Metrics table
// - Coverage Analysis table
// - Recommendations list
```

### Generate Mission Report (HTML)

```typescript
const htmlReport = await reportingService.generateMissionReport(
  'mission_html_001',
  {
    format: 'html',
    includeSummary: true,
    includeRecommendations: true,
    includeCharts: true
  }
);

// Open in browser:
// file:///<path>/backend/reports/mission_html_001_20250128.html
```

### Generate Mission Report (PDF)

```typescript
const pdfReport = await reportingService.generateMissionReport(
  'mission_pdf_001',
  {
    format: 'pdf',
    includeSummary: true,
    includeRecommendations: true
  }
);

// Note: Currently generates HTML structure
// Production: Will use Puppeteer for true PDF
```

### Mission Report Data Structure

```typescript
interface MissionReport {
  mission: {
    id: string;
    name: string;
    status: string;
    scheduledStartTime: Date;
    actualStartTime?: Date;
    actualEndTime?: Date;
    siteId: string;
    siteName: string;
    organizationId: string;
  };
  
  performance: {
    duration: number;           // milliseconds
    totalDistance: number;      // meters
    areaSurveyed: number;       // square meters
    coverageEfficiency: number; // percentage
    batteryUsage: number;       // percentage
    averageSpeed: number;       // m/s
    maxAltitude: number;        // meters
    weatherImpact: string;      // 'low' | 'medium' | 'high'
    qualityScore: number;       // 0-100
  };
  
  coverage: {
    plannedArea: number;
    actualArea: number;
    efficiency: number;
    gaps: Array<{
      area: number;
      location: any;  // GeoJSON
      severity: string;
    }>;
    overlaps: Array<{
      area: number;
      percentage: number;
      location: any;
    }>;
    qualityMetrics: {
      overallScore: number;
      patternCompliance: number;
      imageOverlapQuality: number;
      altitudeConsistency: number;
      speedConsistency: number;
    };
  };
  
  telemetry?: {
    totalPoints: number;
    flightPath: any[];  // GeoJSON LineString
    batteryProfile: number[];
    altitudeProfile: number[];
  };
  
  recommendations?: Array<{
    category: string;
    priority: string;
    description: string;
    expectedImpact: string;
  }>;
}
```

---

## 🚁 Fleet Reports

### Generate Fleet Report

```typescript
const timeRange = {
  start: new Date('2025-01-01'),
  end: new Date('2025-01-31'),
  granularity: 'day' as const
};

const fleetReport = await reportingService.generateFleetReport(
  'site_headquarters_01',
  timeRange,
  {
    format: 'json',
    includeAnomalies: true,
    minUtilization: 0  // Include all drones
  }
);
```

### Fleet Report (HTML with Styling)

```typescript
const htmlFleetReport = await reportingService.generateFleetReport(
  'site_field_02',
  {
    start: new Date('2025-01-01'),
    end: new Date('2025-12-31'),
    granularity: 'month'
  },
  {
    format: 'html',
    includeAnomalies: true
  }
);

// HTML includes:
// - Professional styling
// - Color-coded performance indicators
// - Responsive tables
// - Status badges
```

### Fleet Report (CSV for Excel)

```typescript
const csvFleetReport = await reportingService.generateFleetReport(
  'site_warehouse_03',
  timeRange,
  { format: 'csv' }
);

// CSV structure:
// Section 1: Site & Period Info
// Section 2: Fleet Summary
// Section 3: Individual Drone Details (tabular)
// Section 4: Performance Anomalies
```

### Fleet Report Data Structure

```typescript
interface FleetReport {
  site: {
    id: string;
    name: string;
    organizationId: string;
  };
  
  period: TimeRange;
  
  summary: {
    totalDrones: number;
    totalFlightHours: number;
    averagePerformance: number;
    successRate: number;
  };
  
  drones: Array<{
    id: string;
    serialNumber: string;
    model: string;
    flightTime: number;
    missionsCompleted: number;
    missionsAborted: number;
    utilizationRate: number;
    performanceScore: number;
    maintenanceEvents: number;
  }>;
  
  anomalies?: Array<{
    droneId: string;
    serialNumber: string;
    type: string;
    severity: string;
    description: string;
    detectedAt: Date;
  }>;
}
```

---

## 📈 Executive Summaries

### Generate Organization Executive Summary

```typescript
const executiveSummary = await reportingService.generateExecutiveSummary(
  'org_acme_corp',
  {
    start: new Date('2025-Q1-START'),
    end: new Date('2025-Q1-END'),
    granularity: 'week'
  },
  {
    format: 'html',
    includeRecommendations: true,
    includeTrends: true,
    includeSiteComparison: true
  }
);
```

### Executive Summary (PDF for Board Meeting)

```typescript
const boardReport = await reportingService.generateExecutiveSummary(
  'org_enterprise_inc',
  {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
    granularity: 'month'
  },
  {
    format: 'pdf',
    includeRecommendations: true,
    includeTrends: true,
    fileName: 'annual_board_report_2024.pdf'
  }
);
```

### Executive Summary (JSON for API)

```typescript
const apiSummary = await reportingService.generateExecutiveSummary(
  'org_api_consumer',
  timeRange,
  {
    format: 'json',
    includeRecommendations: true,
    includeTrends: true
  }
);

// JSON structure - perfect for dashboards
const data = JSON.parse(
  await fs.promises.readFile(apiSummary.filePath, 'utf-8')
);

console.log('Total Surveys:', data.summary.totalSurveys);
console.log('Avg Efficiency:', data.summary.avgEfficiency);
console.log('Top Site:', data.siteComparison[0].siteName);
```

### Executive Summary Data Structure

```typescript
interface ExecutiveSummary {
  organization: {
    id: string;
    name: string;
  };
  
  period: TimeRange;
  
  summary: {
    totalSurveys: number;
    totalAreaCovered: number;
    totalFlightHours: number;
    activeDrones: number;
    avgEfficiency: number;
    successRate: number;
  };
  
  siteComparison?: Array<{
    siteId: string;
    siteName: string;
    surveys: number;
    areaCovered: number;
    efficiency: number;
    successRate: number;
    rank: number;
  }>;
  
  fleetOverview?: {
    totalDrones: number;
    activeDrones: number;
    avgUtilization: number;
    maintenanceDue: number;
    performanceDistribution: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
    topPerformers: string[];
    underperformers: string[];
  };
  
  trends?: {
    surveyVolume: Array<{
      period: string;
      count: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    }>;
    efficiency: Array<{
      period: string;
      value: number;
      trend: string;
    }>;
  };
  
  recommendations?: Array<{
    category: string;
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }>;
}
```

---

## 🛠️ Custom Reports

### Basic Custom Report

```typescript
const customReport = await reportingService.generateCustomReport(
  {
    title: 'Weekly Performance Review',
    description: 'Weekly analytics for site operations',
    
    sections: [
      {
        id: 'kpi_metrics',
        title: 'Key Performance Indicators',
        type: 'metrics',
        dataSource: 'analytics'
      },
      {
        id: 'mission_table',
        title: 'Completed Missions',
        type: 'table',
        dataSource: 'missions',
        columns: ['name', 'status', 'duration', 'efficiency']
      }
    ],
    
    filters: {
      siteIds: ['site_001'],
      missionStatuses: ['COMPLETED']
    },
    
    timeRange: {
      start: new Date('2025-01-20'),
      end: new Date('2025-01-27'),
      granularity: 'day'
    },
    
    format: 'html'
  },
  'user_analyst_42'
);
```

### Advanced Custom Report with Charts

```typescript
const advancedReport = await reportingService.generateCustomReport(
  {
    title: 'Monthly Analytics Dashboard',
    description: 'Comprehensive monthly performance analysis',
    
    sections: [
      // Metrics Section
      {
        id: 'monthly_kpis',
        title: 'Monthly KPIs',
        type: 'metrics',
        dataSource: 'analytics'
      },
      
      // Chart Section
      {
        id: 'efficiency_trend',
        title: 'Efficiency Trend',
        type: 'chart',
        dataSource: 'analytics',
        chartType: 'line'
      },
      
      // Table Section
      {
        id: 'top_missions',
        title: 'Top Performing Missions',
        type: 'table',
        dataSource: 'missions',
        columns: ['name', 'efficiency', 'area', 'quality']
      },
      
      // Recommendations
      {
        id: 'action_items',
        title: 'Recommended Actions',
        type: 'recommendations',
        dataSource: 'analytics'
      },
      
      // Text Section
      {
        id: 'summary_notes',
        title: 'Executive Notes',
        type: 'text',
        content: 'This month showed significant improvements in coverage efficiency...'
      }
    ],
    
    filters: {
      siteIds: ['site_001', 'site_002'],
      droneIds: ['drone_alpha', 'drone_beta'],
      missionStatuses: ['COMPLETED'],
      minQualityScore: 75,
      maxQualityScore: 100
    },
    
    timeRange: {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31'),
      granularity: 'day'
    },
    
    format: 'html'
  },
  'user_manager_15'
);
```

### Custom Report Configuration

```typescript
interface CustomReportConfig {
  title: string;
  description?: string;
  
  sections: Array<{
    id: string;
    title: string;
    type: 'metrics' | 'chart' | 'table' | 'text' | 'recommendations';
    dataSource: string;
    columns?: string[];      // For table sections
    chartType?: 'line' | 'bar' | 'pie' | 'area';  // For chart sections
    content?: string;        // For text sections
  }>;
  
  filters: {
    siteIds?: string[];
    droneIds?: string[];
    missionStatuses?: string[];
    minQualityScore?: number;
    maxQualityScore?: number;
  };
  
  timeRange: {
    start: Date;
    end: Date;
    granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  
  format: 'json' | 'csv' | 'html' | 'pdf';
}
```

### Section Types Explained

#### 1. Metrics Section
```typescript
{
  type: 'metrics',
  dataSource: 'analytics'
  // Displays: KPI cards with key metrics
}
```

#### 2. Chart Section
```typescript
{
  type: 'chart',
  dataSource: 'analytics',
  chartType: 'line'  // or 'bar', 'pie', 'area'
  // Displays: Chart placeholder/data
}
```

#### 3. Table Section
```typescript
{
  type: 'table',
  dataSource: 'missions',
  columns: ['name', 'status', 'duration', 'efficiency']
  // Displays: Formatted data table
}
```

#### 4. Recommendations Section
```typescript
{
  type: 'recommendations',
  dataSource: 'analytics'
  // Displays: Prioritized action items
}
```

#### 5. Text Section
```typescript
{
  type: 'text',
  content: 'Your custom markdown or text content...'
  // Displays: Formatted text block
}
```

---

## 📤 Export Formats

### JSON Export

**Best for:**
- API integrations
- Data processing
- Archival storage
- Database imports

```typescript
const jsonReport = await reportingService.generateMissionReport(
  missionId,
  { format: 'json' }
);

// Read the data
const data = JSON.parse(
  await fs.promises.readFile(jsonReport.filePath, 'utf-8')
);

// Use in application
processReportData(data);
```

### CSV Export

**Best for:**
- Excel analysis
- Google Sheets
- Business intelligence tools
- Statistical software

```typescript
const csvReport = await reportingService.generateMissionReport(
  missionId,
  { format: 'csv' }
);

// Open in Excel or import to BI tool
// Each section is clearly labeled
// Tabular data is properly formatted
```

### HTML Export

**Best for:**
- Web viewing
- Email reports
- Intranet publishing
- Quick previews

```typescript
const htmlReport = await reportingService.generateMissionReport(
  missionId,
  { format: 'html', includeCharts: true }
);

// Features:
// - Professional styling
// - Responsive design
// - Print-friendly
// - Color-coded metrics
// - Visual indicators
```

### PDF Export

**Best for:**
- Print distribution
- Official documents
- Presentations
- Archival

```typescript
const pdfReport = await reportingService.generateMissionReport(
  missionId,
  { format: 'pdf' }
);

// Note: Current implementation uses HTML structure
// Production: Integrate Puppeteer for true PDF conversion
```

---

## ⚙️ Configuration Options

### Report Options

```typescript
interface ReportOptions {
  // Required
  format: 'json' | 'csv' | 'html' | 'pdf';
  
  // Optional
  includeSummary?: boolean;         // Include executive summary
  includeCharts?: boolean;          // Include chart data
  includeRecommendations?: boolean; // Include action items
  includeRawData?: boolean;         // Include raw telemetry
  includeAnomalies?: boolean;       // Include anomaly detection
  includeTrends?: boolean;          // Include trend analysis
  includeSiteComparison?: boolean;  // Compare sites
  
  // File options
  fileName?: string;                // Custom filename
  templateId?: string;              // Template to use
  
  // Filtering
  minUtilization?: number;          // Min drone utilization %
  minQualityScore?: number;         // Min quality score
}
```

### Time Range Configuration

```typescript
interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

// Examples:
const daily = {
  start: new Date('2025-01-01'),
  end: new Date('2025-01-31'),
  granularity: 'day' as const
};

const monthly = {
  start: new Date('2025-01-01'),
  end: new Date('2025-12-31'),
  granularity: 'month' as const
};

const yearly = {
  start: new Date('2020-01-01'),
  end: new Date('2024-12-31'),
  granularity: 'year' as const
};
```

---

## 🚨 Error Handling

### Try-Catch Pattern

```typescript
try {
  const report = await reportingService.generateMissionReport(
    missionId,
    { format: 'json' }
  );
  
  console.log('Success:', report.fileName);
  
} catch (error) {
  console.error('Report generation failed:', error.message);
  
  // Handle specific errors
  if (error.message.includes('Mission not found')) {
    // Mission doesn't exist
  } else if (error.message.includes('No mission data')) {
    // Mission exists but has no data
  } else {
    // Other errors
  }
}
```

### Common Errors

```typescript
// Mission not found
"Mission with ID mission_123 not found"

// No data available
"No mission data found for mission mission_456"

// Invalid format
"Invalid report format: xyz"

// File system errors
"Failed to write report to file: [reason]"

// Database errors
"Failed to fetch mission analytics: [reason]"
```

### Validation Before Generation

```typescript
async function generateSafeReport(missionId: string) {
  // Check if mission exists
  const mission = await prisma.mission.findUnique({
    where: { id: missionId }
  });
  
  if (!mission) {
    throw new Error('Mission not found');
  }
  
  // Check if mission is complete
  if (mission.status !== 'COMPLETED') {
    console.warn('Mission not completed, report may be incomplete');
  }
  
  // Generate report
  return await reportingService.generateMissionReport(
    missionId,
    { format: 'json' }
  );
}
```

---

## ✅ Best Practices

### 1. Choose the Right Format

```typescript
// For APIs and data processing
{ format: 'json' }

// For spreadsheet analysis
{ format: 'csv' }

// For web viewing and emails
{ format: 'html' }

// For print and official docs
{ format: 'pdf' }
```

### 2. Use Descriptive Filenames

```typescript
const report = await reportingService.generateMissionReport(
  missionId,
  {
    format: 'pdf',
    fileName: `mission_${mission.name}_${site.name}_${date}.pdf`
  }
);
```

### 3. Include Recommendations for Actionable Reports

```typescript
const report = await reportingService.generateMissionReport(
  missionId,
  {
    format: 'html',
    includeRecommendations: true  // Adds action items
  }
);
```

### 4. Batch Report Generation

```typescript
async function generateMonthlyReports(siteId: string, month: Date) {
  const missions = await prisma.mission.findMany({
    where: {
      siteId,
      actualEndTime: {
        gte: startOfMonth(month),
        lte: endOfMonth(month)
      },
      status: 'COMPLETED'
    }
  });
  
  const reports = await Promise.all(
    missions.map(mission =>
      reportingService.generateMissionReport(
        mission.id,
        { format: 'pdf', includeRecommendations: true }
      )
    )
  );
  
  return reports;
}
```

### 5. Cache Reports for Performance

```typescript
const reportCache = new Map<string, ReportMetadata>();

async function getCachedReport(missionId: string, format: ReportFormat) {
  const cacheKey = `${missionId}_${format}`;
  
  if (reportCache.has(cacheKey)) {
    const cached = reportCache.get(cacheKey)!;
    
    // Check if cache is still valid (e.g., 1 hour)
    const cacheAge = Date.now() - cached.generatedAt.getTime();
    if (cacheAge < 3600000) {
      return cached;
    }
  }
  
  // Generate fresh report
  const report = await reportingService.generateMissionReport(
    missionId,
    { format }
  );
  
  reportCache.set(cacheKey, report);
  return report;
}
```

### 6. Clean Up Old Reports

```typescript
import fs from 'fs/promises';
import path from 'path';

async function cleanupOldReports(daysOld: number = 30) {
  const reportsDir = path.join(__dirname, '../../reports');
  const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  
  const files = await fs.readdir(reportsDir);
  
  for (const file of files) {
    const filePath = path.join(reportsDir, file);
    const stats = await fs.stat(filePath);
    
    if (stats.mtimeMs < cutoffDate) {
      await fs.unlink(filePath);
      console.log(`Deleted old report: ${file}`);
    }
  }
}
```

### 7. Validate Before Exporting

```typescript
async function validateAndGenerate(missionId: string) {
  // Fetch analytics first
  const analytics = await analyticsService.generateMissionReport(missionId);
  
  // Check data quality
  if (analytics.performance.qualityScore < 50) {
    console.warn('Low quality mission data - report may be incomplete');
  }
  
  if (analytics.coverage.gaps.length > 10) {
    console.warn('Many coverage gaps detected');
  }
  
  // Generate report
  return await reportingService.generateMissionReport(
    missionId,
    {
      format: 'html',
      includeRecommendations: true
    }
  );
}
```

### 8. Use TypeScript for Type Safety

```typescript
import { ReportFormat, ReportOptions, TimeRange } from '../types/analytics.types';

async function generateTypedReport(
  missionId: string,
  format: ReportFormat,
  options?: Partial<ReportOptions>
): Promise<ReportMetadata> {
  return await reportingService.generateMissionReport(
    missionId,
    {
      format,
      ...options
    }
  );
}
```

---

## 📚 Complete Example: Automated Reporting Pipeline

```typescript
import { ReportingService } from './services/reporting.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const reporting = new ReportingService();

/**
 * Generate comprehensive reports for all completed missions
 * in the last week, organized by site
 */
async function generateWeeklyReports() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  // Get all sites
  const sites = await prisma.site.findMany({
    include: { organization: true }
  });
  
  for (const site of sites) {
    console.log(`Processing site: ${site.name}`);
    
    // 1. Generate fleet report (HTML for web viewing)
    const fleetReport = await reporting.generateFleetReport(
      site.id,
      {
        start: oneWeekAgo,
        end: new Date(),
        granularity: 'day'
      },
      {
        format: 'html',
        includeAnomalies: true,
        fileName: `fleet_${site.name}_weekly.html`
      }
    );
    
    console.log(`  Fleet report: ${fleetReport.fileName}`);
    
    // 2. Get completed missions
    const missions = await prisma.mission.findMany({
      where: {
        siteId: site.id,
        status: 'COMPLETED',
        actualEndTime: { gte: oneWeekAgo }
      }
    });
    
    // 3. Generate mission reports (PDF for archival)
    for (const mission of missions) {
      const missionReport = await reporting.generateMissionReport(
        mission.id,
        {
          format: 'pdf',
          includeRecommendations: true,
          fileName: `mission_${mission.name}_${site.name}.pdf`
        }
      );
      
      console.log(`  Mission report: ${missionReport.fileName}`);
    }
    
    // 4. Generate executive summary for organization
    if (site.organizationId) {
      const execSummary = await reporting.generateExecutiveSummary(
        site.organizationId,
        {
          start: oneWeekAgo,
          end: new Date(),
          granularity: 'day'
        },
        {
          format: 'html',
          includeRecommendations: true,
          includeTrends: true,
          fileName: `executive_${site.organization.name}_weekly.html`
        }
      );
      
      console.log(`  Executive summary: ${execSummary.fileName}`);
    }
  }
  
  console.log('Weekly reports generated successfully!');
}

// Run the pipeline
generateWeeklyReports()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 🎯 Quick Reference

### Mission Report
```typescript
reportingService.generateMissionReport(missionId, { format: 'json' })
```

### Fleet Report
```typescript
reportingService.generateFleetReport(siteId, timeRange, { format: 'html' })
```

### Executive Summary
```typescript
reportingService.generateExecutiveSummary(orgId, timeRange, { format: 'pdf' })
```

### Custom Report
```typescript
reportingService.generateCustomReport(config, userId)
```

---

## 📖 Additional Resources

- See `TASK_3_COMPLETION.md` for implementation details
- Test suite: `backend/test-reporting-service.js`
- Service file: `backend/src/services/reporting.service.ts`
- Analytics service: `backend/src/services/analytics.service.ts`
- Type definitions: `backend/src/types/analytics.types.ts`

---

**Happy Reporting! 📊**
