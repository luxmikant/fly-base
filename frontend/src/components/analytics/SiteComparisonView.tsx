/**
 * Site Comparison View
 * Displays side-by-side comparison of site performance metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';

interface SiteMetrics {
  siteId: string;
  siteName: string;
  totalSurveys: number;
  totalAreaCovered: number;
  totalFlightTime: number;
  activeDrones: number;
  averageEfficiency: number;
  successRate: number;
  weatherDelays: number;
  maintenanceDowntime: number;
  utilizationRate: number;
  benchmarkScore: number;
  rank?: number;
}

interface SiteComparisonData {
  sites: SiteMetrics[];
  timeRange: {
    start: string;
    end: string;
  };
  totalSites: number;
}

interface SiteComparisonViewProps {
  className?: string;
}

export function SiteComparisonView({ className }: SiteComparisonViewProps) {
  const [comparisonData, setComparisonData] = useState<SiteComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);

  // Fetch site comparison data
  const fetchComparisonData = async () => {
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
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity: 'day'
      });

      // Add selected sites if any
      if (selectedSites.length > 0) {
        params.append('siteIds', selectedSites.join(','));
      }

      const response = await fetch(`/api/v1/analytics/sites/compare?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch site comparison: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setComparisonData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch site comparison');
      }
    } catch (err) {
      console.error('Error fetching site comparison:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get performance color
  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-yellow-600 bg-yellow-50';
    if (score >= 70) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  // Get rank badge color
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (rank <= 3) return 'bg-gray-100 text-gray-800 border-gray-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  // Calculate comparison metrics
  const calculateComparison = (value: number, average: number) => {
    const diff = ((value - average) / average) * 100;
    return {
      percentage: Math.abs(diff),
      isAbove: diff > 0,
      isSignificant: Math.abs(diff) > 5
    };
  };

  useEffect(() => {
    fetchComparisonData();
  }, [selectedSites]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span>Loading site comparison...</span>
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
          <Button onClick={fetchComparisonData} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!comparisonData || comparisonData.sites.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No site data available for comparison</p>
        </div>
      </div>
    );
  }

  // Calculate averages for comparison
  const averages = {
    efficiency: comparisonData.sites.reduce((sum, site) => sum + site.averageEfficiency, 0) / comparisonData.sites.length,
    successRate: comparisonData.sites.reduce((sum, site) => sum + site.successRate, 0) / comparisonData.sites.length,
    utilizationRate: comparisonData.sites.reduce((sum, site) => sum + site.utilizationRate, 0) / comparisonData.sites.length,
    benchmarkScore: comparisonData.sites.reduce((sum, site) => sum + site.benchmarkScore, 0) / comparisonData.sites.length
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Site Performance Comparison</h2>
          <p className="text-muted-foreground">
            Compare performance metrics across {comparisonData.totalSites} operational sites
          </p>
        </div>
        <Button onClick={fetchComparisonData} variant="outline" size="sm">
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averages.efficiency.toFixed(1)}%</div>
            <Progress value={averages.efficiency} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averages.successRate.toFixed(1)}%</div>
            <Progress value={averages.successRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averages.utilizationRate.toFixed(1)}%</div>
            <Progress value={averages.utilizationRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Average Benchmark</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averages.benchmarkScore.toFixed(1)}</div>
            <Progress value={averages.benchmarkScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Site Comparison Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {comparisonData.sites.map((site) => {
          const efficiencyComp = calculateComparison(site.averageEfficiency, averages.efficiency);
          const successComp = calculateComparison(site.successRate, averages.successRate);
          const utilizationComp = calculateComparison(site.utilizationRate, averages.utilizationRate);

          return (
            <Card key={site.siteId} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-lg">{site.siteName}</CardTitle>
                  </div>
                  {site.rank && (
                    <Badge className={getRankColor(site.rank)}>
                      #{site.rank}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {site.activeDrones} active drones • {site.totalSurveys} surveys
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-semibold">{site.totalAreaCovered.toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">km² Covered</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-semibold">{(site.totalFlightTime / 60).toFixed(1)}</div>
                    <div className="text-xs text-muted-foreground">Flight Hours</div>
                  </div>
                </div>

                <Separator />

                {/* Performance Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Efficiency</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{site.averageEfficiency.toFixed(1)}%</span>
                      {efficiencyComp.isSignificant && (
                        <div className="flex items-center space-x-1">
                          {efficiencyComp.isAbove ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs ${efficiencyComp.isAbove ? 'text-green-600' : 'text-red-600'}`}>
                            {efficiencyComp.percentage.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Progress value={site.averageEfficiency} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Success Rate</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{site.successRate.toFixed(1)}%</span>
                      {successComp.isSignificant && (
                        <div className="flex items-center space-x-1">
                          {successComp.isAbove ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs ${successComp.isAbove ? 'text-green-600' : 'text-red-600'}`}>
                            {successComp.percentage.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Progress value={site.successRate} className="h-2" />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Utilization</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{site.utilizationRate.toFixed(1)}%</span>
                      {utilizationComp.isSignificant && (
                        <div className="flex items-center space-x-1">
                          {utilizationComp.isAbove ? (
                            <TrendingUp className="h-3 w-3 text-green-600" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-600" />
                          )}
                          <span className={`text-xs ${utilizationComp.isAbove ? 'text-green-600' : 'text-red-600'}`}>
                            {utilizationComp.percentage.toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Progress value={site.utilizationRate} className="h-2" />
                </div>

                <Separator />

                {/* Benchmark Score */}
                <div className="text-center">
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPerformanceColor(site.benchmarkScore)}`}>
                    Benchmark Score: {site.benchmarkScore.toFixed(1)}
                  </div>
                </div>

                {/* Issues */}
                {(site.weatherDelays > 0 || site.maintenanceDowntime > 0) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Issues</h4>
                    {site.weatherDelays > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Weather Delays</span>
                        </span>
                        <span>{Math.round(site.weatherDelays / 60)}h</span>
                      </div>
                    )}
                    {site.maintenanceDowntime > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center space-x-1">
                          <Activity className="h-3 w-3" />
                          <span>Maintenance</span>
                        </span>
                        <span>{Math.round(site.maintenanceDowntime / 60)}h</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Performance Rankings */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Rankings</CardTitle>
          <CardDescription>
            Sites ranked by overall benchmark score
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {comparisonData.sites
              .sort((a, b) => b.benchmarkScore - a.benchmarkScore)
              .map((site, index) => (
                <div key={site.siteId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge className={getRankColor(index + 1)}>
                      #{index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">{site.siteName}</div>
                      <div className="text-sm text-muted-foreground">
                        {site.totalSurveys} surveys • {site.activeDrones} drones
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{site.benchmarkScore.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Benchmark</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}