/**
 * Performance Gauges Component
 * Real-time performance indicators and gauges
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Activity, 
  Battery, 
  Gauge, 
  Signal,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  threshold: {
    min: number;
    max: number;
    optimal: { min: number; max: number };
  };
  status: 'optimal' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

interface GaugeProps {
  metric: PerformanceMetric;
  size?: number;
}

interface PerformanceGaugesProps {
  droneId?: string;
  missionId?: string;
  className?: string;
  realTime?: boolean;
}

function CircularGauge({ metric, size = 120 }: GaugeProps) {
  const { value, threshold, status, name, unit } = metric;
  const percentage = Math.min(100, Math.max(0, (value / threshold.max) * 100));
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getStatusColor = () => {
    switch (status) {
      case 'optimal': return '#10B981'; // green
      case 'warning': return '#F59E0B'; // yellow
      case 'critical': return '#EF4444'; // red
      default: return '#6B7280'; // gray
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'optimal': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={getStatusColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold" style={{ color: getStatusColor() }}>
            {value.toFixed(1)}
          </div>
          <div className="text-xs text-gray-500">{unit}</div>
        </div>
      </div>
      
      {/* Label and status */}
      <div className="mt-2 text-center">
        <div className="flex items-center gap-1 justify-center">
          {getStatusIcon()}
          <span className="text-sm font-medium">{name}</span>
        </div>
        <div className="text-xs text-gray-500">
          Range: {threshold.min}-{threshold.max} {unit}
        </div>
      </div>
    </div>
  );
}

function LinearGauge({ metric }: GaugeProps) {
  const { value, threshold, status, name, unit, trend } = metric;
  const percentage = Math.min(100, Math.max(0, (value / threshold.max) * 100));
  const optimalStart = (threshold.optimal.min / threshold.max) * 100;
  const optimalEnd = (threshold.optimal.max / threshold.max) * 100;

  const getStatusColor = () => {
    switch (status) {
      case 'optimal': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
      default: return '→';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{value.toFixed(1)} {unit}</span>
          <span className="text-sm text-gray-500">{getTrendIcon()}</span>
        </div>
      </div>
      
      <div className="relative">
        {/* Background bar */}
        <div className="w-full h-3 bg-gray-200 rounded-full">
          {/* Optimal range indicator */}
          <div
            className="absolute h-3 bg-green-100 rounded-full"
            style={{
              left: `${optimalStart}%`,
              width: `${optimalEnd - optimalStart}%`
            }}
          />
          {/* Current value indicator */}
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getStatusColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Scale markers */}
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{threshold.min}</span>
          <span>{threshold.optimal.min}</span>
          <span>{threshold.optimal.max}</span>
          <span>{threshold.max}</span>
        </div>
      </div>
    </div>
  );
}

export function PerformanceGauges({ 
  droneId, 
  missionId, 
  className,
  realTime = true 
}: PerformanceGaugesProps) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch performance metrics
  useEffect(() => {
    fetchMetrics();
    
    if (realTime) {
      const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [droneId, missionId, realTime]);

  const fetchMetrics = async () => {
    try {
      const params = new URLSearchParams();
      if (droneId) params.append('droneId', droneId);
      if (missionId) params.append('missionId', missionId);

      const response = await fetch(`/api/v1/analytics/performance/metrics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setMetrics(result.data);
          setLastUpdate(new Date());
        }
      } else {
        // Use mock data for development
        setMetrics(getMockMetrics());
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      // Use mock data as fallback
      setMetrics(getMockMetrics());
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  };

  const getMockMetrics = (): PerformanceMetric[] => [
    {
      id: 'battery',
      name: 'Battery Level',
      value: 78,
      unit: '%',
      threshold: { min: 0, max: 100, optimal: { min: 20, max: 100 } },
      status: 'optimal',
      trend: 'down',
      lastUpdated: new Date(),
    },
    {
      id: 'efficiency',
      name: 'Mission Efficiency',
      value: 87.5,
      unit: '%',
      threshold: { min: 0, max: 100, optimal: { min: 80, max: 100 } },
      status: 'optimal',
      trend: 'up',
      lastUpdated: new Date(),
    },
    {
      id: 'signal',
      name: 'Signal Strength',
      value: -65,
      unit: 'dBm',
      threshold: { min: -100, max: -30, optimal: { min: -70, max: -30 } },
      status: 'optimal',
      trend: 'stable',
      lastUpdated: new Date(),
    },
    {
      id: 'speed',
      name: 'Ground Speed',
      value: 12.3,
      unit: 'm/s',
      threshold: { min: 0, max: 25, optimal: { min: 8, max: 15 } },
      status: 'optimal',
      trend: 'stable',
      lastUpdated: new Date(),
    },
    {
      id: 'altitude',
      name: 'Altitude',
      value: 125,
      unit: 'm',
      threshold: { min: 0, max: 200, optimal: { min: 100, max: 150 } },
      status: 'optimal',
      trend: 'stable',
      lastUpdated: new Date(),
    },
    {
      id: 'temperature',
      name: 'Temperature',
      value: 42,
      unit: '°C',
      threshold: { min: -10, max: 60, optimal: { min: 10, max: 50 } },
      status: 'warning',
      trend: 'up',
      lastUpdated: new Date(),
    },
  ];

  const circularMetrics = metrics.filter(m => 
    ['battery', 'efficiency', 'signal'].includes(m.id)
  );
  
  const linearMetrics = metrics.filter(m => 
    !['battery', 'efficiency', 'signal'].includes(m.id)
  );

  const getOverallStatus = () => {
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;
    
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'optimal';
  };

  const getStatusBadge = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'optimal':
        return <Badge className="bg-green-100 text-green-800">All Systems Optimal</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warnings Present</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800">Critical Issues</Badge>;
      default:
        return <Badge variant="outline">Unknown Status</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Loading real-time performance data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>
              Real-time performance indicators and system health
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {realTime && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                <span>Updated {lastUpdate.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Circular Gauges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {circularMetrics.map(metric => (
            <CircularGauge key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Linear Gauges */}
        <div className="space-y-6">
          {linearMetrics.map(metric => (
            <LinearGauge key={metric.id} metric={metric} />
          ))}
        </div>

        {/* Summary Statistics */}
        <div className="mt-8 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.filter(m => m.status === 'optimal').length}
              </div>
              <div className="text-sm text-gray-600">Optimal</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {metrics.filter(m => m.status === 'warning').length}
              </div>
              <div className="text-sm text-gray-600">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {metrics.filter(m => m.status === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length)}
              </div>
              <div className="text-sm text-gray-600">Avg Score</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PerformanceGauges;