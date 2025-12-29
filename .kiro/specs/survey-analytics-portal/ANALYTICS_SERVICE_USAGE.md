# Analytics Service Usage Guide

## Quick Start

```typescript
import { PrismaClient } from '@prisma/client';
import { AnalyticsService } from './services/analytics.service';

const prisma = new PrismaClient();
const analyticsService = new AnalyticsService(prisma);
```

## Mission Analytics

### Get Mission Performance Metrics

```typescript
// Get comprehensive performance metrics for a mission
const metrics = await analyticsService.getMissionPerformanceMetrics(missionId);

console.log(`Duration: ${metrics.duration} minutes`);
console.log(`Distance: ${metrics.distanceCovered} km`);
console.log(`Area Surveyed: ${metrics.areaSurveyed} km²`);
console.log(`Coverage Efficiency: ${metrics.coverageEfficiency}%`);
console.log(`Quality Score: ${metrics.qualityScore}/100`);
```

### Calculate Coverage Efficiency

```typescript
// Get detailed coverage analysis
const coverage = await analyticsService.calculateCoverageEfficiency(missionId);

console.log(`Coverage: ${coverage.coveragePercentage}%`);
console.log(`Quality Score: ${coverage.qualityScore}/100`);
console.log(`Gaps Found: ${coverage.gapAreas.length}`);
console.log(`Recommendations:`, coverage.recommendations);

// Check industry standards compliance
coverage.industryStandards.forEach(standard => {
  console.log(`${standard.standard}: ${standard.compliance ? '✅' : '❌'}`);
  console.log(`  Score: ${standard.score}/100`);
  if (standard.recommendation) {
    console.log(`  Recommendation: ${standard.recommendation}`);
  }
});
```

### Generate Mission Report

```typescript
// Generate comprehensive mission report
const report = await analyticsService.generateMissionReport(missionId);

console.log('Mission:', report.mission.name);
console.log('Status:', report.mission.status);
console.log('\nPerformance:', report.performance);
console.log('\nCoverage:', report.coverage);
console.log('\nRecommendations:', report.recommendations);
```

## Fleet Analytics

### Get Fleet Utilization

```typescript
// Define time range
const timeRange = {
  start: new Date('2025-01-01'),
  end: new Date('2025-01-31'),
  granularity: 'day' as const
};

// Get fleet utilization for a site
const fleetUtil = await analyticsService.getFleetUtilization(siteId, timeRange);

console.log(`Total Flight Hours: ${fleetUtil.totalFlightHours}`);
console.log(`Fleet Success Rate: ${fleetUtil.fleetSuccessRate}%`);
console.log(`Average Mission Duration: ${fleetUtil.averageMissionDuration} min`);

// Check individual drone utilization
fleetUtil.utilizationByDrone.forEach(drone => {
  console.log(`\nDrone ${drone.serialNumber}:`);
  console.log(`  Missions: ${drone.totalMissions}`);
  console.log(`  Success Rate: ${(drone.successfulMissions / drone.totalMissions * 100).toFixed(1)}%`);
  console.log(`  Utilization: ${drone.utilizationRate}%`);
  console.log(`  Performance Score: ${drone.performanceScore}/100`);
});

// Check maintenance alerts
console.log(`\nMaintenance Alerts: ${fleetUtil.maintenanceAlerts.length}`);
fleetUtil.maintenanceAlerts.forEach(alert => {
  console.log(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
  console.log(`    Due: ${alert.dueDate.toISOString().split('T')[0]}`);
});
```

### Calculate Maintenance Schedule

```typescript
// Get maintenance predictions for a drone
const maintenanceAlerts = await analyticsService.calculateMaintenanceSchedule(droneId);

maintenanceAlerts.forEach(alert => {
  console.log(`\n${alert.severity.toUpperCase()} - ${alert.alertType}`);
  console.log(`Type: ${alert.maintenanceType}`);
  console.log(`Message: ${alert.message}`);
  console.log(`Due Date: ${alert.dueDate.toISOString().split('T')[0]}`);
  console.log(`Estimated Downtime: ${alert.estimatedDowntime} minutes`);
});
```

### Identify Performance Anomalies

```typescript
// Detect performance anomalies across the fleet
const anomalies = await analyticsService.identifyPerformanceAnomalies(siteId);

// Group by severity
const critical = anomalies.filter(a => a.severity === 'critical');
const high = anomalies.filter(a => a.severity === 'high');
const medium = anomalies.filter(a => a.severity === 'medium');

console.log(`\n🚨 Critical Issues: ${critical.length}`);
critical.forEach(anomaly => {
  console.log(`  Drone ${anomaly.serialNumber}:`);
  console.log(`    ${anomaly.description}`);
  console.log(`    Action: ${anomaly.recommendation}`);
});

console.log(`\n⚠️  High Priority: ${high.length}`);
console.log(`📊 Medium Priority: ${medium.length}`);

// Get detailed view of all anomalies
anomalies.forEach(anomaly => {
  console.log(`\n[${anomaly.severity.toUpperCase()}] ${anomaly.type}`);
  console.log(`  Drone: ${anomaly.serialNumber}`);
  console.log(`  ${anomaly.description}`);
  console.log(`  Value: ${anomaly.value.toFixed(2)} (threshold: ${anomaly.threshold})`);
  if (anomaly.recommendation) {
    console.log(`  💡 ${anomaly.recommendation}`);
  }
});
```

## Organization & Site Analytics

### Get Organization Metrics

```typescript
const timeRange = {
  start: new Date('2025-01-01'),
  end: new Date('2025-12-31'),
  granularity: 'month' as const
};

const orgMetrics = await analyticsService.getOrganizationMetrics(orgId, timeRange);

console.log(`Total Surveys: ${orgMetrics.totalSurveys}`);
console.log(`Total Area Covered: ${orgMetrics.totalAreaCovered} km²`);
console.log(`Total Flight Time: ${orgMetrics.totalFlightTime} hours`);
console.log(`Active Drones: ${orgMetrics.activeDrones}`);
console.log(`Average Efficiency: ${orgMetrics.averageEfficiency}%`);
console.log(`Success Rate: ${orgMetrics.successRate}%`);

// Analyze trends
console.log('\nTrends:');
orgMetrics.trendsData.forEach(trend => {
  const change = trend.change ? `${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%` : 'N/A';
  console.log(`  ${trend.date.toISOString().split('T')[0]}: ${trend.value} (${change})`);
});
```

### Get Site Metrics

```typescript
const siteMetrics = await analyticsService.getSiteMetrics(siteId, timeRange);

console.log(`Site: ${siteMetrics.siteName}`);
console.log(`Total Surveys: ${siteMetrics.totalSurveys}`);
console.log(`Efficiency: ${siteMetrics.averageEfficiency}%`);
console.log(`Success Rate: ${siteMetrics.successRate}%`);
console.log(`Weather Delays: ${siteMetrics.weatherDelays} minutes`);
console.log(`Maintenance Downtime: ${siteMetrics.maintenanceDowntime} minutes`);
console.log(`Performance Rank: ${siteMetrics.performanceRank || 'N/A'}`);
console.log(`Benchmark Score: ${siteMetrics.benchmarkScore}/100`);
```

## Error Handling

```typescript
try {
  const metrics = await analyticsService.getMissionPerformanceMetrics(missionId);
  // Use metrics
} catch (error) {
  if (error.name === 'DataNotFoundError') {
    console.error(`Mission not found: ${error.details.id}`);
  } else if (error.name === 'InsufficientDataError') {
    console.error(`Not enough data: ${error.message}`);
  } else if (error.name === 'AnalyticsError') {
    console.error(`Analytics error: ${error.message}`);
    console.error(`Code: ${error.code}`);
  } else {
    console.error(`Unexpected error: ${error.message}`);
  }
}
```

## Best Practices

### 1. Use Time Ranges Appropriately

```typescript
// For recent data (last 7 days)
const recentTimeRange = {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  end: new Date(),
  granularity: 'day' as const
};

// For historical analysis (last year)
const historicalTimeRange = {
  start: new Date(new Date().getFullYear() - 1, 0, 1),
  end: new Date(new Date().getFullYear(), 0, 0),
  granularity: 'month' as const
};
```

### 2. Batch Process Multiple Missions

```typescript
// Efficient batch processing
const missionIds = ['id1', 'id2', 'id3'];
const metricsPromises = missionIds.map(id => 
  analyticsService.getMissionPerformanceMetrics(id)
);
const allMetrics = await Promise.all(metricsPromises);
```

### 3. Monitor Performance Regularly

```typescript
// Set up regular monitoring
async function monitorFleetHealth(siteId: string) {
  const timeRange = {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    end: new Date(),
    granularity: 'hour' as const
  };

  const [fleetUtil, anomalies] = await Promise.all([
    analyticsService.getFleetUtilization(siteId, timeRange),
    analyticsService.identifyPerformanceAnomalies(siteId)
  ]);

  // Alert on critical issues
  const criticalIssues = anomalies.filter(a => a.severity === 'critical');
  if (criticalIssues.length > 0) {
    console.error('🚨 CRITICAL FLEET ISSUES DETECTED!');
    criticalIssues.forEach(issue => {
      console.error(`  - ${issue.description}`);
    });
  }

  // Check maintenance alerts
  const urgentMaintenance = fleetUtil.maintenanceAlerts.filter(
    a => a.alertType === 'overdue' || a.severity === 'high'
  );
  if (urgentMaintenance.length > 0) {
    console.warn('⚠️  URGENT MAINTENANCE REQUIRED');
    urgentMaintenance.forEach(alert => {
      console.warn(`  - ${alert.message}`);
    });
  }
}
```

### 4. Cache Results When Appropriate

```typescript
// Example with manual caching
const cacheKey = `mission_metrics_${missionId}`;
let metrics = cache.get(cacheKey);

if (!metrics) {
  metrics = await analyticsService.getMissionPerformanceMetrics(missionId);
  cache.set(cacheKey, metrics, 3600); // Cache for 1 hour
}
```

## Common Use Cases

### Dashboard Data

```typescript
async function getDashboardData(siteId: string) {
  const timeRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
    granularity: 'day' as const
  };

  const [fleetUtil, anomalies] = await Promise.all([
    analyticsService.getFleetUtilization(siteId, timeRange),
    analyticsService.identifyPerformanceAnomalies(siteId)
  ]);

  return {
    fleetStats: {
      totalFlightHours: fleetUtil.totalFlightHours,
      successRate: fleetUtil.fleetSuccessRate,
      averageMissionDuration: fleetUtil.averageMissionDuration
    },
    alerts: {
      maintenance: fleetUtil.maintenanceAlerts.length,
      anomalies: anomalies.length,
      critical: anomalies.filter(a => a.severity === 'critical').length
    },
    drones: fleetUtil.utilizationByDrone.map(d => ({
      id: d.droneId,
      serialNumber: d.serialNumber,
      performance: d.performanceScore,
      utilization: d.utilizationRate,
      status: d.performanceScore < 60 ? 'warning' : 'good'
    }))
  };
}
```

### Mission Quality Report

```typescript
async function getMissionQualityReport(missionId: string) {
  const report = await analyticsService.generateMissionReport(missionId);
  
  const qualityAnalysis = {
    overall: report.performance.qualityScore,
    coverage: {
      score: report.coverage.qualityScore,
      efficiency: report.coverage.coveragePercentage,
      gaps: report.coverage.gapAreas.length
    },
    performance: {
      efficiency: report.performance.coverageEfficiency,
      batteryUsage: report.performance.batteryConsumption,
      distance: report.performance.distanceCovered
    },
    compliance: report.coverage.industryStandards.every(s => s.compliance),
    recommendations: report.recommendations
  };

  return qualityAnalysis;
}
```

### Fleet Health Summary

```typescript
async function getFleetHealthSummary(siteId: string) {
  const anomalies = await analyticsService.identifyPerformanceAnomalies(siteId);
  
  const healthSummary = {
    overall: anomalies.length === 0 ? 'healthy' : 
             anomalies.some(a => a.severity === 'critical') ? 'critical' :
             anomalies.some(a => a.severity === 'high') ? 'warning' : 'caution',
    issues: {
      critical: anomalies.filter(a => a.severity === 'critical').length,
      high: anomalies.filter(a => a.severity === 'high').length,
      medium: anomalies.filter(a => a.severity === 'medium').length,
      low: anomalies.filter(a => a.severity === 'low').length
    },
    topIssues: anomalies
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 5)
  };

  return healthSummary;
}
```

## Integration with API Routes

```typescript
// Example route handler
router.get('/analytics/missions/:id/metrics', async (req, res) => {
  try {
    const { id } = req.params;
    const metrics = await analyticsService.getMissionPerformanceMetrics(id);
    res.json({ success: true, data: metrics });
  } catch (error) {
    if (error.name === 'DataNotFoundError') {
      res.status(404).json({ success: false, error: 'Mission not found' });
    } else {
      res.status(500).json({ success: false, error: error.message });
    }
  }
});
```

---

This guide covers the main usage patterns for the Analytics Service. For more details, see the implementation in `backend/src/services/analytics.service.ts`.
