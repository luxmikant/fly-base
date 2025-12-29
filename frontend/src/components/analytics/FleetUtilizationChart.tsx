/**
 * Fleet Utilization Chart
 * Displays fleet usage statistics and drone performance metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Drone, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface DroneUtilization {
  droneId: string;
  serialNumber: string;
  model: string;
  totalFlightTime: number;
  totalMissions: number;
  successfulMissions: number;
  failedMissions: number;
  utilizationRate: number;
  performanceScore: number;
  averageMissionTime: number;
}

interface FleetUtilization {
  siteId: string;
  totalFlightHours: number;
  averageMissionDuration: number;
  fleetSuccessRate: number;
  utilizationByDrone: DroneUtilization[];
  maintenanceAlerts: Array<{
    droneId: string;
    alertType: string;
    severity: string;
    message: string;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
}

interface FleetUtilizationChartProps {
  siteId?: string;
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function FleetUtilizationChart({ siteId, className }: FleetUtilizationChartProps) {
  const [fleetData, setFleetData] = useState<FleetUtilization | null>(null);
  const [sites, setSites] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'utilization' | 'performance'>('utilization');

  // Fetch sites
  const fetchSites = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/v1/sites', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSites(result.data);
          if (result.data.length > 0 && !selectedSite && !siteId) {
            setSelectedSite(result.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching sites:', err);
    }
  };

  // Fetch fleet utilization data
  const fetchFleetData = async (targetSiteId: string) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      const params = new URLSearchParams({
        siteId: targetSiteId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity: 'day'
      });

      const response = await fetch(`/api/v1/analytics/fleet?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch fleet data: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setFleetData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch fleet data');
      }
    } catch (err) {
      console.error('Error fetching fleet data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get performance color
  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get utilization color
  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Prepare chart data
  const chartData = fleetData?.utilizationByDrone.map(drone => ({
    name: drone.serialNumber,
    utilization: drone.utilizationRate,
    performance: drone.performanceScore,
    flightTime: drone.totalFlightTime / 60, // Convert to hours
    missions: drone.totalMissions,
    successRate: drone.totalMissions > 0 ? (drone.successfulMissions / drone.totalMissions) * 100 : 0
  })) || [];

  // Prepare pie chart data for utilization distribution
  const utilizationDistribution = fleetData?.utilizationByDrone.reduce((acc, drone) => {
    const rate = drone.utilizationRate;
    if (rate >= 80) acc.high++;
    else if (rate >= 60) acc.medium++;
    else acc.low++;
    return acc;
  }, { high: 0, medium: 0, low: 0 });

  const pieData = utilizationDistribution ? [
    { name: 'High (80%+)', value: utilizationDistribution.high, color: '#00C49F' },
    { name: 'Medium (60-79%)', value: utilizationDistribution.medium, color: '#FFBB28' },
    { name: 'Low (<60%)', value: utilizationDistribution.low, color: '#FF8042' }
  ] : [];

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    const targetSiteId = siteId || selectedSite;
    if (targetSiteId) {
      fetchFleetData(targetSiteId);
    }
  }, [siteId, selectedSite]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Fleet Utilization</CardTitle>
            <CardDescription>
              Drone usage statistics and performance metrics
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utilization">Utilization</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
              </SelectContent>
            </Select>
            {!siteId && (
              <Select value={selectedSite} onValueChange={setSelectedSite}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-600 py-4">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {fleetData && !loading && (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{fleetData.utilizationByDrone.length}</div>
                <div className="text-sm text-muted-foreground">Total Drones</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{fleetData.totalFlightHours.toFixed(1)}h</div>
                <div className="text-sm text-muted-foreground">Total Flight Time</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{fleetData.averageMissionDuration.toFixed(0)}m</div>
                <div className="text-sm text-muted-foreground">Avg Mission</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{fleetData.fleetSuccessRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div>
                <h4 className="text-sm font-medium mb-4">
                  {viewMode === 'utilization' ? 'Utilization Rates' : 'Performance Scores'}
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey={viewMode === 'utilization' ? 'utilization' : 'performance'}
                      fill="#8884d8"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div>
                <h4 className="text-sm font-medium mb-4">Utilization Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Drone Details Table */}
            <div>
              <h4 className="text-sm font-medium mb-4">Drone Details</h4>
              <div className="space-y-2">
                {fleetData.utilizationByDrone.map((drone) => (
                  <div key={drone.droneId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Drone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{drone.serialNumber}</div>
                        <div className="text-sm text-muted-foreground">{drone.model}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{drone.totalMissions} missions</div>
                        <div className="text-xs text-muted-foreground">
                          {(drone.totalFlightTime / 60).toFixed(1)}h flight time
                        </div>
                      </div>
                      
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Utilization</span>
                          <span>{drone.utilizationRate.toFixed(0)}%</span>
                        </div>
                        <Progress value={drone.utilizationRate} className="h-2" />
                      </div>
                      
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>Performance</span>
                          <span className={getPerformanceColor(drone.performanceScore)}>
                            {drone.performanceScore.toFixed(0)}
                          </span>
                        </div>
                        <Progress value={drone.performanceScore} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance Alerts */}
            {fleetData.maintenanceAlerts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-4 flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span>Maintenance Alerts</span>
                </h4>
                <div className="space-y-2">
                  {fleetData.maintenanceAlerts.map((alert, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">{alert.message}</span>
                      </div>
                      <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                        {alert.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!fleetData && !loading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No fleet data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}