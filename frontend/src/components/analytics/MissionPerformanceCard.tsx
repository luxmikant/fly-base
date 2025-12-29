/**
 * Mission Performance Card
 * Displays individual mission metrics and performance indicators
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { 
  Clock, 
  MapPin, 
  Battery, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface MissionMetrics {
  missionId: string;
  duration: number;
  distanceCovered: number;
  areaSurveyed: number;
  coverageEfficiency: number;
  batteryConsumption: number;
  averageSpeed: number;
  qualityScore: number;
  successRate: number;
}

interface Mission {
  id: string;
  name: string;
  status: string;
  scheduledStart?: string;
  actualStart?: string;
  actualEnd?: string;
}

interface MissionPerformanceCardProps {
  missionId?: string;
  className?: string;
}

export function MissionPerformanceCard({ missionId, className }: MissionPerformanceCardProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [metrics, setMetrics] = useState<MissionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent missions
  const fetchRecentMissions = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/v1/missions?limit=10&status=COMPLETED', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMissions(result.data);
          if (result.data.length > 0 && !selectedMission) {
            setSelectedMission(result.data[0]);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching missions:', err);
    }
  };

  // Fetch mission metrics
  const fetchMissionMetrics = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/v1/analytics/missions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch mission metrics: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        setMetrics(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch mission metrics');
      }
    } catch (err) {
      console.error('Error fetching mission metrics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'ABORTED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get quality score color
  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  useEffect(() => {
    fetchRecentMissions();
  }, []);

  useEffect(() => {
    if (missionId) {
      // If specific mission ID provided, fetch that mission
      fetchMissionMetrics(missionId);
    } else if (selectedMission) {
      // Otherwise fetch metrics for selected mission
      fetchMissionMetrics(selectedMission.id);
    }
  }, [missionId, selectedMission]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mission Performance</CardTitle>
            <CardDescription>
              Detailed metrics for individual survey missions
            </CardDescription>
          </div>
          {selectedMission && (
            <Badge className={getStatusColor(selectedMission.status)}>
              {selectedMission.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mission Selector */}
        {!missionId && missions.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Mission:</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedMission?.id || ''}
              onChange={(e) => {
                const mission = missions.find(m => m.id === e.target.value);
                setSelectedMission(mission || null);
              }}
            >
              {missions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="flex items-center space-x-2 text-red-600 py-4">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {metrics && selectedMission && !loading && (
          <div className="space-y-4">
            {/* Mission Info */}
            <div>
              <h4 className="font-medium mb-2">{selectedMission.name}</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Duration: {formatDuration(metrics.duration)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Distance: {metrics.distanceCovered.toFixed(2)} km</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Key Metrics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Area Surveyed</span>
                <span className="text-sm">{metrics.areaSurveyed.toFixed(2)} km²</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Coverage Efficiency</span>
                  <span className="text-sm">{metrics.coverageEfficiency.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.coverageEfficiency} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center space-x-1">
                    <Battery className="h-4 w-4" />
                    <span>Battery Usage</span>
                  </span>
                  <span className="text-sm">{metrics.batteryConsumption.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.batteryConsumption} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quality Score</span>
                  <span className={`text-sm font-medium ${getQualityColor(metrics.qualityScore)}`}>
                    {metrics.qualityScore.toFixed(1)}/100
                  </span>
                </div>
                <Progress value={metrics.qualityScore} className="h-2" />
              </div>
            </div>

            <Separator />

            {/* Performance Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-semibold">{metrics.averageSpeed.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg Speed (m/s)</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-lg font-semibold">{metrics.successRate.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                Generate Report
              </Button>
            </div>
          </div>
        )}

        {!metrics && !loading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Select a mission to view performance metrics</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}