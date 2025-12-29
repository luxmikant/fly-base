/**
 * Analytics Dashboard
 * Main dashboard component for survey analytics portal
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  Activity, 
  MapPin, 
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { DateRange } from 'react-day-picker';

// Analytics Components
import { 
  MissionPerformanceCard,
  FleetUtilizationChart,
  TrendLineChart,
  PerformanceBarChart,
  SiteComparisonView,
  RecentAnomalies
} from './index';

// Types
interface DashboardSummary {
  summary: {
    totalSurveys: number;
    totalAreaCovered: number;
    totalFlightTime: number;
    averageEfficiency: number;
    successRate: number;
    costPerSurvey: number;
  };
  fleet: {
    totalDrones: number;
    activeDrones: number;
    totalSites: number;
  };
  trends: Array<{
    date: string;
    value: number;
    metric: string;
    change?: number;
  }>;
  anomalies: Array<{
    type: string;
    severity: string;
    droneId: string;
    serialNumber: string;
    description: string;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
}

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date()
  });
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        // For development, use mock data if no token
        console.log('No auth token found, using mock data');
        setDashboardData(getMockDashboardData());
        return;
      }

      const response = await fetch('/api/v1/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Use mock data for development
          console.log('Authentication failed, using mock data');
          setDashboardData(getMockDashboardData());
          return;
        }
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      // Use mock data as fallback
      console.log('Using mock data as fallback');
      setDashboardData(getMockDashboardData());
    } finally {
      setLoading(false);
    }
  };

  // Mock data for development
  const getMockDashboardData = (): DashboardSummary => ({
    summary: {
      totalSurveys: 1247,
      totalAreaCovered: 2847.3,
      totalFlightTime: 342.7,
      averageEfficiency: 87.4,
      successRate: 94.2,
      costPerSurvey: 285
    },
    fleet: {
      totalDrones: 24,
      activeDrones: 18,
      totalSites: 6
    },
    trends: [
      { date: '2024-12-01', value: 45, metric: 'surveys', change: 12 },
      { date: '2024-12-02', value: 52, metric: 'surveys', change: 15 },
      { date: '2024-12-03', value: 38, metric: 'surveys', change: -8 },
      { date: '2024-12-04', value: 61, metric: 'surveys', change: 23 },
      { date: '2024-12-05', value: 47, metric: 'surveys', change: -14 },
      { date: '2024-12-06', value: 55, metric: 'surveys', change: 8 },
      { date: '2024-12-07', value: 49, metric: 'surveys', change: -6 }
    ],
    anomalies: [
      {
        type: 'performance',
        severity: 'medium',
        droneId: 'DRN-001',
        serialNumber: 'FB-2024-001',
        description: 'Battery efficiency below threshold'
      },
      {
        type: 'maintenance',
        severity: 'high',
        droneId: 'DRN-007',
        serialNumber: 'FB-2024-007',
        description: 'Scheduled maintenance overdue'
      },
      {
        type: 'coverage',
        severity: 'low',
        droneId: 'DRN-012',
        serialNumber: 'FB-2024-012',
        description: 'Coverage gap detected in sector 4'
      }
    ],
    timeRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    }
  });

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  // Export data
  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/v1/analytics/export', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'organization',
          format,
          timeRange: {
            start: selectedTimeRange?.from?.toISOString(),
            end: selectedTimeRange?.to?.toISOString(),
            granularity: 'day'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        // Trigger download
        window.open(result.data.downloadUrl, '_blank');
      } else {
        throw new Error(result.error || 'Export failed');
      }
    } catch (err) {
      console.error('Export error:', err);
      // You could show a toast notification here
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedTimeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading analytics dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Survey Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into drone survey operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select onValueChange={(value: string) => handleExport(value as 'json' | 'csv' | 'pdf')}>
            <SelectTrigger className="w-32">
              <Download className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Export" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.summary.totalSurveys.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.summary.totalAreaCovered.toFixed(1)} km² covered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flight Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.summary.totalFlightTime.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Across {dashboardData.fleet.activeDrones} active drones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.summary.averageEfficiency.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.summary.successRate.toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Survey</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardData.summary.costPerSurvey.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.fleet.totalSites} sites operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="missions">Missions</TabsTrigger>
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="sites">Sites</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Trends Chart */}
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Survey Volume Trends</CardTitle>
                <CardDescription>
                  Daily survey activity over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <TrendLineChart 
                  data={dashboardData.trends}
                  height={300}
                />
              </CardContent>
            </Card>

            {/* Recent Anomalies */}
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
                <CardDescription>
                  Performance anomalies requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentAnomalies anomalies={dashboardData.anomalies} />
              </CardContent>
            </Card>
          </div>

          {/* Fleet Status */}
          <Card>
            <CardHeader>
              <CardTitle>Fleet Status Overview</CardTitle>
              <CardDescription>
                Current status of all drones across sites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FleetUtilizationChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="missions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <MissionPerformanceCard />
            <Card>
              <CardHeader>
                <CardTitle>Mission Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceBarChart />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <FleetUtilizationChart />
        </TabsContent>

        <TabsContent value="sites" className="space-y-4">
          <SiteComparisonView />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Efficiency Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <TrendLineChart 
                  data={dashboardData.trends}
                  height={300}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <PerformanceBarChart />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}