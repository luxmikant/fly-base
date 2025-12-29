/**
 * Performance Bar Chart
 * Displays comparative performance metrics across different categories
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';

interface PerformanceData {
  category: string;
  efficiency: number;
  quality: number;
  utilization: number;
  successRate: number;
  count: number;
}

interface PerformanceBarChartProps {
  data?: PerformanceData[];
  height?: number;
  className?: string;
}

export function PerformanceBarChart({ 
  data: providedData, 
  height = 300, 
  className 
}: PerformanceBarChartProps) {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState<'efficiency' | 'quality' | 'utilization' | 'successRate'>('efficiency');
  const [groupBy, setGroupBy] = useState<'site' | 'drone' | 'mission_type'>('site');

  // Fetch performance data
  const fetchPerformanceData = async () => {
    if (providedData) {
      setData(providedData);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      // For demo purposes, we'll generate sample data
      // In a real app, this would fetch from the analytics API
      const sampleData: PerformanceData[] = [
        {
          category: 'Site A',
          efficiency: 87.5,
          quality: 92.3,
          utilization: 78.2,
          successRate: 94.1,
          count: 45
        },
        {
          category: 'Site B',
          efficiency: 82.1,
          quality: 88.7,
          utilization: 85.3,
          successRate: 91.2,
          count: 38
        },
        {
          category: 'Site C',
          efficiency: 91.2,
          quality: 95.1,
          utilization: 72.8,
          successRate: 96.7,
          count: 52
        },
        {
          category: 'Site D',
          efficiency: 79.8,
          quality: 84.2,
          utilization: 88.9,
          successRate: 89.3,
          count: 29
        },
        {
          category: 'Site E',
          efficiency: 85.6,
          quality: 90.4,
          utilization: 81.7,
          successRate: 92.8,
          count: 41
        }
      ];

      setData(sampleData);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get color based on performance value
  const getPerformanceColor = (value: number) => {
    if (value >= 90) return '#22c55e'; // green
    if (value >= 80) return '#eab308'; // yellow
    if (value >= 70) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium text-blue-600">Efficiency:</span> {data.efficiency.toFixed(1)}%
            </p>
            <p className="text-sm">
              <span className="font-medium text-green-600">Quality:</span> {data.quality.toFixed(1)}%
            </p>
            <p className="text-sm">
              <span className="font-medium text-purple-600">Utilization:</span> {data.utilization.toFixed(1)}%
            </p>
            <p className="text-sm">
              <span className="font-medium text-orange-600">Success Rate:</span> {data.successRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {data.count} missions
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Get metric label
  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'efficiency': return 'Coverage Efficiency (%)';
      case 'quality': return 'Quality Score (%)';
      case 'utilization': return 'Utilization Rate (%)';
      case 'successRate': return 'Success Rate (%)';
      default: return 'Performance (%)';
    }
  };

  // Calculate statistics
  const stats = data.length > 0 ? {
    average: data.reduce((sum, item) => sum + item[metric], 0) / data.length,
    max: Math.max(...data.map(item => item[metric])),
    min: Math.min(...data.map(item => item[metric])),
    total: data.reduce((sum, item) => sum + item.count, 0)
  } : null;

  useEffect(() => {
    fetchPerformanceData();
  }, [groupBy]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efficiency">Efficiency</SelectItem>
              <SelectItem value="quality">Quality</SelectItem>
              <SelectItem value="utilization">Utilization</SelectItem>
              <SelectItem value="successRate">Success Rate</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="site">By Site</SelectItem>
              <SelectItem value="drone">By Drone</SelectItem>
              <SelectItem value="mission_type">By Type</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {stats && (
          <div className="flex items-center space-x-4 text-sm">
            <Badge variant="outline">
              Avg: {stats.average.toFixed(1)}%
            </Badge>
            <Badge variant="outline">
              Range: {stats.min.toFixed(1)}% - {stats.max.toFixed(1)}%
            </Badge>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="category"
            stroke="#666"
            fontSize={12}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Bar
            dataKey={metric}
            fill="#8884d8"
            radius={[4, 4, 0, 0]}
            name={getMetricLabel(metric)}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Performance Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold">{stats.average.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Average</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold">{stats.max.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Best</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold">{stats.min.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground">Lowest</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-semibold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Missions</div>
          </div>
        </div>
      )}

      {/* Performance Rankings */}
      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Performance Rankings</h4>
        <div className="space-y-2">
          {data
            .sort((a, b) => b[metric] - a[metric])
            .slice(0, 5)
            .map((item, index) => (
              <div key={item.category} className="flex items-center justify-between p-2 bg-muted rounded">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <span className="text-sm font-medium">{item.category}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{item[metric].toFixed(1)}%</span>
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getPerformanceColor(item[metric]) }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}