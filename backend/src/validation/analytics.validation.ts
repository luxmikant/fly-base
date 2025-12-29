/**
 * Analytics Data Validation Schemas
 * Zod schemas for validating analytics data structures
 */

import { z } from 'zod';

// Base validation schemas

export const TimeRangeSchema = z.object({
  start: z.date(),
  end: z.date(),
  granularity: z.enum(['hour', 'day', 'week', 'month', 'year'])
}).refine(data => data.end > data.start, {
  message: "End date must be after start date"
});

export const GeoPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()))),
  area: z.number().min(0).optional(),
  description: z.string().optional()
});

export const WeatherConditionsSchema = z.object({
  temperature: z.number().min(-50).max(60), // Celsius
  humidity: z.number().min(0).max(100),
  windSpeed: z.number().min(0).max(200), // m/s
  windDirection: z.number().min(0).max(360),
  visibility: z.number().min(0).max(50), // kilometers
  conditions: z.string(),
  impact: z.enum(['none', 'minor', 'moderate', 'severe'])
});

export const FlightPathPointSchema = z.object({
  timestamp: z.date(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().min(0).max(10000), // meters
  speed: z.number().min(0).max(100), // m/s
  heading: z.number().min(0).max(360),
  batteryLevel: z.number().min(0).max(100)
});

// Core Analytics Schemas

export const MissionMetricsSchema = z.object({
  missionId: z.string().uuid(),
  duration: z.number().min(0), // minutes
  distanceCovered: z.number().min(0), // kilometers
  areaSurveyed: z.number().min(0), // square kilometers
  coverageEfficiency: z.number().min(0).max(100), // percentage
  batteryConsumption: z.number().min(0).max(100), // percentage
  averageSpeed: z.number().min(0).max(100), // m/s
  averageAltitude: z.number().min(0).max(10000), // meters
  maxAltitude: z.number().min(0).max(10000), // meters
  minAltitude: z.number().min(0).max(10000), // meters
  telemetryPoints: z.number().min(0),
  successRate: z.number().min(0).max(100), // percentage
  qualityScore: z.number().min(0).max(100), // 0-100
  weatherConditions: WeatherConditionsSchema.optional(),
  flightPathData: z.array(FlightPathPointSchema).optional()
}).refine(data => data.maxAltitude >= data.minAltitude, {
  message: "Max altitude must be greater than or equal to min altitude"
});

export const DroneUtilizationSchema = z.object({
  droneId: z.string().uuid(),
  serialNumber: z.string(),
  model: z.string(),
  totalFlightTime: z.number().min(0), // minutes
  totalMissions: z.number().min(0),
  successfulMissions: z.number().min(0),
  failedMissions: z.number().min(0),
  averageMissionTime: z.number().min(0), // minutes
  batteryUsage: z.number().min(0), // total percentage used
  utilizationRate: z.number().min(0).max(100), // percentage
  performanceScore: z.number().min(0).max(100), // 0-100
  maintenanceEvents: z.number().min(0),
  downtimeMinutes: z.number().min(0),
  lastMaintenance: z.date().optional(),
  nextMaintenanceDue: z.date().optional()
}).refine(data => data.totalMissions === data.successfulMissions + data.failedMissions, {
  message: "Total missions must equal successful + failed missions"
});

export const FleetUtilizationSchema = z.object({
  siteId: z.string().uuid(),
  totalFlightHours: z.number().min(0),
  averageMissionDuration: z.number().min(0),
  fleetSuccessRate: z.number().min(0).max(100),
  utilizationByDrone: z.array(DroneUtilizationSchema),
  maintenanceAlerts: z.array(z.object({
    droneId: z.string().uuid(),
    alertType: z.enum(['due', 'overdue', 'recommended']),
    severity: z.enum(['low', 'medium', 'high']),
    message: z.string(),
    dueDate: z.date(),
    estimatedDowntime: z.number().min(0),
    maintenanceType: z.string()
  })),
  performanceScores: z.array(z.object({
    droneId: z.string().uuid(),
    score: z.number().min(0).max(100),
    factors: z.array(z.object({
      name: z.string(),
      weight: z.number().min(0).max(1),
      score: z.number().min(0).max(100),
      description: z.string()
    })),
    trend: z.enum(['improving', 'stable', 'declining']),
    lastUpdated: z.date()
  })),
  timeRange: TimeRangeSchema
});

export const OrgMetricsSchema = z.object({
  orgId: z.string().uuid(),
  totalSurveys: z.number().min(0),
  totalAreaCovered: z.number().min(0), // square kilometers
  totalFlightTime: z.number().min(0), // hours
  activeDrones: z.number().min(0),
  costPerSurvey: z.number().min(0),
  costPerArea: z.number().min(0), // per square kilometer
  averageEfficiency: z.number().min(0).max(100), // percentage
  successRate: z.number().min(0).max(100), // percentage
  trendsData: z.array(z.object({
    date: z.date(),
    value: z.number(),
    metric: z.string(),
    change: z.number().optional()
  })),
  seasonalPatterns: z.array(z.object({
    period: z.string(),
    value: z.number(),
    average: z.number(),
    variance: z.number()
  })),
  timeRange: TimeRangeSchema
});

export const SiteMetricsSchema = z.object({
  siteId: z.string().uuid(),
  siteName: z.string(),
  totalSurveys: z.number().min(0),
  totalAreaCovered: z.number().min(0), // square kilometers
  totalFlightTime: z.number().min(0), // minutes
  activeDrones: z.number().min(0),
  averageEfficiency: z.number().min(0).max(100), // percentage
  successRate: z.number().min(0).max(100), // percentage
  weatherDelays: z.number().min(0), // minutes
  maintenanceDowntime: z.number().min(0), // minutes
  utilizationRate: z.number().min(0).max(100), // percentage
  performanceRank: z.number().min(1).optional(), // within organization
  benchmarkScore: z.number().min(0).max(100), // 0-100
  timeRange: TimeRangeSchema
});

export const CoverageAnalysisSchema = z.object({
  missionId: z.string().uuid(),
  plannedArea: z.number().min(0), // square kilometers
  actualCoverage: z.number().min(0), // square kilometers
  coveragePercentage: z.number().min(0).max(200), // percentage (can exceed 100% due to overlap)
  gapAreas: z.array(GeoPolygonSchema),
  overlapAreas: z.array(GeoPolygonSchema),
  overlapEfficiency: z.number().min(0).max(100), // percentage
  patternCompliance: z.number().min(0).max(100), // percentage
  qualityScore: z.number().min(0).max(100), // 0-100
  recommendations: z.array(z.string()),
  industryStandards: z.array(z.object({
    standard: z.string(),
    requirement: z.string(),
    compliance: z.boolean(),
    score: z.number().min(0).max(100),
    recommendation: z.string().optional()
  }))
});

// Query validation schemas

export const AnalyticsFiltersSchema = z.object({
  siteIds: z.array(z.string().uuid()).optional(),
  droneIds: z.array(z.string().uuid()).optional(),
  missionStatuses: z.array(z.string()).optional(),
  flightPatterns: z.array(z.string()).optional(),
  minEfficiency: z.number().min(0).max(100).optional(),
  maxEfficiency: z.number().min(0).max(100).optional(),
  minQualityScore: z.number().min(0).max(100).optional(),
  maxQualityScore: z.number().min(0).max(100).optional(),
  weatherConditions: z.array(z.string()).optional()
}).refine(data => {
  if (data.minEfficiency && data.maxEfficiency) {
    return data.minEfficiency <= data.maxEfficiency;
  }
  return true;
}, {
  message: "Min efficiency must be less than or equal to max efficiency"
}).refine(data => {
  if (data.minQualityScore && data.maxQualityScore) {
    return data.minQualityScore <= data.maxQualityScore;
  }
  return true;
}, {
  message: "Min quality score must be less than or equal to max quality score"
});

export const AnalyticsQuerySchema = z.object({
  timeRange: TimeRangeSchema,
  filters: AnalyticsFiltersSchema,
  groupBy: z.array(z.string()).optional(),
  orderBy: z.array(z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc'])
  })).optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional()
});

// Report validation schemas

export const MissionReportSchema = z.object({
  mission: z.object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.string(),
    scheduledStart: z.date(),
    actualStart: z.date().optional(),
    actualEnd: z.date().optional()
  }),
  performance: MissionMetricsSchema,
  coverage: CoverageAnalysisSchema,
  telemetry: z.object({
    totalPoints: z.number().min(0),
    flightPath: z.array(FlightPathPointSchema),
    batteryUsage: z.array(z.object({
      timestamp: z.date(),
      batteryLevel: z.number().min(0).max(100),
      consumption: z.number().min(0)
    }))
  }),
  weather: WeatherConditionsSchema,
  recommendations: z.array(z.string()),
  generatedAt: z.date()
});

export const ExecutiveReportSchema = z.object({
  organization: z.object({
    id: z.string().uuid(),
    name: z.string()
  }),
  period: TimeRangeSchema,
  summary: OrgMetricsSchema,
  siteComparison: z.array(z.object({
    site: z.object({
      id: z.string().uuid(),
      name: z.string()
    }),
    metrics: SiteMetricsSchema,
    ranking: z.number().min(1),
    benchmarkComparison: z.object({
      vsOrganizationAverage: z.number(),
      vsIndustryStandard: z.number(),
      strengths: z.array(z.string()),
      improvements: z.array(z.string())
    })
  })),
  fleetOverview: z.object({
    totalDrones: z.number().min(0),
    activeDrones: z.number().min(0),
    utilizationRate: z.number().min(0).max(100),
    maintenanceDue: z.number().min(0),
    performanceDistribution: z.object({
      excellent: z.number().min(0),
      good: z.number().min(0),
      average: z.number().min(0),
      poor: z.number().min(0)
    }),
    topPerformers: z.array(DroneUtilizationSchema),
    underperformers: z.array(DroneUtilizationSchema)
  }),
  trends: z.object({
    surveyVolume: z.object({
      metric: z.string(),
      data: z.array(z.object({
        date: z.date(),
        value: z.number(),
        metric: z.string(),
        change: z.number().optional()
      })),
      trend: z.enum(['increasing', 'decreasing', 'stable']),
      changeRate: z.number(),
      confidence: z.number().min(0).max(100)
    }),
    efficiency: z.object({
      metric: z.string(),
      data: z.array(z.object({
        date: z.date(),
        value: z.number(),
        metric: z.string(),
        change: z.number().optional()
      })),
      trend: z.enum(['increasing', 'decreasing', 'stable']),
      changeRate: z.number(),
      confidence: z.number().min(0).max(100)
    }),
    costEffectiveness: z.object({
      metric: z.string(),
      data: z.array(z.object({
        date: z.date(),
        value: z.number(),
        metric: z.string(),
        change: z.number().optional()
      })),
      trend: z.enum(['increasing', 'decreasing', 'stable']),
      changeRate: z.number(),
      confidence: z.number().min(0).max(100)
    }),
    seasonalPatterns: z.object({
      pattern: z.enum(['quarterly', 'monthly', 'weekly']),
      data: z.array(z.object({
        period: z.string(),
        value: z.number(),
        average: z.number(),
        variance: z.number()
      })),
      peakPeriods: z.array(z.string()),
      lowPeriods: z.array(z.string())
    }),
    projections: z.array(z.object({
      metric: z.string(),
      projectedValue: z.number(),
      confidence: z.number().min(0).max(100),
      timeframe: z.string(),
      assumptions: z.array(z.string())
    }))
  }),
  recommendations: z.array(z.object({
    category: z.enum(['efficiency', 'cost', 'capacity', 'maintenance', 'quality']),
    priority: z.enum(['high', 'medium', 'low']),
    title: z.string(),
    description: z.string(),
    expectedImpact: z.string(),
    implementationEffort: z.enum(['low', 'medium', 'high']),
    timeline: z.string()
  })),
  generatedAt: z.date()
});

// Validation helper functions

export function validateMissionMetrics(data: unknown) {
  return MissionMetricsSchema.parse(data);
}

export function validateFleetUtilization(data: unknown) {
  return FleetUtilizationSchema.parse(data);
}

export function validateOrgMetrics(data: unknown) {
  return OrgMetricsSchema.parse(data);
}

export function validateSiteMetrics(data: unknown) {
  return SiteMetricsSchema.parse(data);
}

export function validateCoverageAnalysis(data: unknown) {
  return CoverageAnalysisSchema.parse(data);
}

export function validateAnalyticsQuery(data: unknown) {
  return AnalyticsQuerySchema.parse(data);
}

export function validateMissionReport(data: unknown) {
  return MissionReportSchema.parse(data);
}

export function validateExecutiveReport(data: unknown) {
  return ExecutiveReportSchema.parse(data);
}

// Type guards for runtime type checking

export function isMissionMetrics(data: unknown): data is z.infer<typeof MissionMetricsSchema> {
  try {
    MissionMetricsSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function isFleetUtilization(data: unknown): data is z.infer<typeof FleetUtilizationSchema> {
  try {
    FleetUtilizationSchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

export function isAnalyticsQuery(data: unknown): data is z.infer<typeof AnalyticsQuerySchema> {
  try {
    AnalyticsQuerySchema.parse(data);
    return true;
  } catch {
    return false;
  }
}

// Export inferred types for use in other modules
export type ValidatedMissionMetrics = z.infer<typeof MissionMetricsSchema>;
export type ValidatedFleetUtilization = z.infer<typeof FleetUtilizationSchema>;
export type ValidatedOrgMetrics = z.infer<typeof OrgMetricsSchema>;
export type ValidatedSiteMetrics = z.infer<typeof SiteMetricsSchema>;
export type ValidatedCoverageAnalysis = z.infer<typeof CoverageAnalysisSchema>;
export type ValidatedAnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;
export type ValidatedMissionReport = z.infer<typeof MissionReportSchema>;
export type ValidatedExecutiveReport = z.infer<typeof ExecutiveReportSchema>;