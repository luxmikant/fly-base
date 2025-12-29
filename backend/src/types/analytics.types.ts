/**
 * Analytics Data Models and Types
 * Comprehensive type definitions for the survey analytics system
 */

// Core Analytics Interfaces

export interface MissionMetrics {
  missionId: string;
  duration: number; // minutes
  distanceCovered: number; // kilometers
  areaSurveyed: number; // square kilometers
  coverageEfficiency: number; // percentage
  batteryConsumption: number; // percentage
  averageSpeed: number; // m/s
  averageAltitude: number; // meters
  maxAltitude: number; // meters
  minAltitude: number; // meters
  telemetryPoints: number;
  successRate: number; // percentage
  qualityScore: number; // 0-100
  weatherConditions?: WeatherConditions;
  flightPathData?: FlightPathPoint[];
}

export interface FleetUtilization {
  siteId: string;
  totalFlightHours: number;
  averageMissionDuration: number;
  fleetSuccessRate: number;
  utilizationByDrone: DroneUtilization[];
  maintenanceAlerts: MaintenanceAlert[];
  performanceScores: PerformanceScore[];
  timeRange: TimeRange;
}

export interface DroneUtilization {
  droneId: string;
  serialNumber: string;
  model: string;
  totalFlightTime: number; // minutes
  totalMissions: number;
  successfulMissions: number;
  failedMissions: number;
  averageMissionTime: number; // minutes
  batteryUsage: number; // total percentage used
  utilizationRate: number; // percentage
  performanceScore: number; // 0-100
  maintenanceEvents: number;
  downtimeMinutes: number;
  lastMaintenance?: Date;
  nextMaintenanceDue?: Date;
}

export interface OrgMetrics {
  orgId: string;
  totalSurveys: number;
  totalAreaCovered: number; // square kilometers
  totalFlightTime: number; // hours
  activeDrones: number;
  costPerSurvey: number;
  costPerArea: number; // per square kilometer
  averageEfficiency: number; // percentage
  successRate: number; // percentage
  trendsData: TrendPoint[];
  seasonalPatterns: SeasonalData[];
  timeRange: TimeRange;
}

export interface SiteMetrics {
  siteId: string;
  siteName: string;
  totalSurveys: number;
  totalAreaCovered: number; // square kilometers
  totalFlightTime: number; // minutes
  activeDrones: number;
  averageEfficiency: number; // percentage
  successRate: number; // percentage
  weatherDelays: number; // minutes
  maintenanceDowntime: number; // minutes
  utilizationRate: number; // percentage
  performanceRank?: number; // within organization
  benchmarkScore: number; // 0-100
  timeRange: TimeRange;
}

export interface CoverageAnalysis {
  missionId: string;
  plannedArea: number; // square kilometers
  actualCoverage: number; // square kilometers
  coveragePercentage: number;
  gapAreas: GeoPolygon[];
  overlapAreas: GeoPolygon[];
  overlapEfficiency: number; // percentage
  patternCompliance: number; // percentage
  qualityScore: number; // 0-100
  recommendations: string[];
  industryStandards: IndustryStandardCheck[];
}

// Supporting Types

export interface TimeRange {
  start: Date;
  end: Date;
  granularity: 'hour' | 'day' | 'week' | 'month' | 'year';
}

export interface TrendPoint {
  date: Date;
  value: number;
  metric: string;
  change?: number; // percentage change from previous period
}

export interface SeasonalData {
  period: string; // 'Q1', 'Q2', etc. or 'Jan', 'Feb', etc.
  value: number;
  average: number;
  variance: number;
}

export interface WeatherConditions {
  temperature: number; // Celsius
  humidity: number; // percentage
  windSpeed: number; // m/s
  windDirection: number; // degrees
  visibility: number; // kilometers
  conditions: string; // 'clear', 'cloudy', 'rain', etc.
  impact: 'none' | 'minor' | 'moderate' | 'severe';
}

export interface FlightPathPoint {
  timestamp: Date;
  latitude: number;
  longitude: number;
  altitude: number; // meters
  speed: number; // m/s
  heading: number; // degrees
  batteryLevel: number; // percentage
}

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: number[][][]; // GeoJSON format
  area?: number; // square kilometers
  description?: string;
}

export interface MaintenanceAlert {
  droneId: string;
  alertType: 'due' | 'overdue' | 'recommended';
  severity: 'low' | 'medium' | 'high';
  message: string;
  dueDate: Date;
  estimatedDowntime: number; // minutes
  maintenanceType: string;
}

export interface PerformanceScore {
  droneId: string;
  score: number; // 0-100
  factors: PerformanceFactor[];
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

export interface PerformanceFactor {
  name: string;
  weight: number; // 0-1
  score: number; // 0-100
  description: string;
}

export interface IndustryStandardCheck {
  standard: string;
  requirement: string;
  compliance: boolean;
  score: number; // 0-100
  recommendation?: string;
}

// Analytics Query Types

export interface AnalyticsQuery {
  timeRange: TimeRange;
  filters: AnalyticsFilters;
  groupBy?: string[];
  orderBy?: OrderBy[];
  limit?: number;
  offset?: number;
}

export interface AnalyticsFilters {
  siteIds?: string[];
  droneIds?: string[];
  missionStatuses?: string[];
  flightPatterns?: string[];
  minEfficiency?: number;
  maxEfficiency?: number;
  minQualityScore?: number;
  maxQualityScore?: number;
  weatherConditions?: string[];
}

export interface OrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

// Report Types

export interface MissionReport {
  mission: {
    id: string;
    name: string;
    status: string;
    scheduledStart: Date;
    actualStart?: Date;
    actualEnd?: Date;
  };
  performance: MissionMetrics;
  coverage: CoverageAnalysis;
  telemetry: {
    totalPoints: number;
    flightPath: FlightPathPoint[];
    batteryUsage: BatteryUsagePoint[];
  };
  weather: WeatherConditions;
  recommendations: string[];
  generatedAt: Date;
}

export interface BatteryUsagePoint {
  timestamp: Date;
  batteryLevel: number; // percentage
  consumption: number; // percentage per minute
}

export interface ExecutiveReport {
  organization: {
    id: string;
    name: string;
  };
  period: TimeRange;
  summary: OrgMetrics;
  siteComparison: SiteComparisonData[];
  fleetOverview: FleetOverviewData;
  trends: TrendAnalysis;
  recommendations: ExecutiveRecommendation[];
  generatedAt: Date;
}

export interface SiteComparisonData {
  site: {
    id: string;
    name: string;
  };
  metrics: SiteMetrics;
  ranking: number;
  benchmarkComparison: BenchmarkComparison;
}

export interface BenchmarkComparison {
  vsOrganizationAverage: number; // percentage difference
  vsIndustryStandard: number; // percentage difference
  strengths: string[];
  improvements: string[];
}

export interface FleetOverviewData {
  totalDrones: number;
  activeDrones: number;
  utilizationRate: number; // percentage
  maintenanceDue: number;
  performanceDistribution: PerformanceDistribution;
  topPerformers: DroneUtilization[];
  underperformers: DroneUtilization[];
}

export interface PerformanceDistribution {
  excellent: number; // count of drones with score 90-100
  good: number; // count of drones with score 70-89
  average: number; // count of drones with score 50-69
  poor: number; // count of drones with score 0-49
}

export interface TrendAnalysis {
  surveyVolume: TrendData;
  efficiency: TrendData;
  costEffectiveness: TrendData;
  seasonalPatterns: SeasonalAnalysis;
  projections: ProjectionData[];
}

export interface TrendData {
  metric: string;
  data: TrendPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  changeRate: number; // percentage change per period
  confidence: number; // 0-100
}

export interface SeasonalAnalysis {
  pattern: 'quarterly' | 'monthly' | 'weekly';
  data: SeasonalData[];
  peakPeriods: string[];
  lowPeriods: string[];
}

export interface ProjectionData {
  metric: string;
  projectedValue: number;
  confidence: number; // 0-100
  timeframe: string;
  assumptions: string[];
}

export interface ExecutiveRecommendation {
  category: 'efficiency' | 'cost' | 'capacity' | 'maintenance' | 'quality';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  timeline: string;
}

// Validation Schemas (for runtime validation)

export interface ValidationSchema {
  required: string[];
  optional: string[];
  types: Record<string, string>;
  ranges: Record<string, { min?: number; max?: number }>;
}

export const MissionMetricsSchema: ValidationSchema = {
  required: ['missionId', 'duration', 'distanceCovered', 'areaSurveyed'],
  optional: ['coverageEfficiency', 'batteryConsumption', 'averageSpeed', 'qualityScore'],
  types: {
    missionId: 'string',
    duration: 'number',
    distanceCovered: 'number',
    areaSurveyed: 'number',
    coverageEfficiency: 'number',
    batteryConsumption: 'number',
    averageSpeed: 'number',
    qualityScore: 'number'
  },
  ranges: {
    duration: { min: 0 },
    distanceCovered: { min: 0 },
    areaSurveyed: { min: 0 },
    coverageEfficiency: { min: 0, max: 100 },
    batteryConsumption: { min: 0, max: 100 },
    qualityScore: { min: 0, max: 100 }
  }
};

// Export utility types
export type AnalyticsEntityType = 'mission' | 'drone' | 'site' | 'organization';
export type MetricType = 'efficiency' | 'utilization' | 'performance' | 'cost' | 'quality';
export type AggregationType = 'sum' | 'average' | 'min' | 'max' | 'count';
export type TimeGranularity = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';