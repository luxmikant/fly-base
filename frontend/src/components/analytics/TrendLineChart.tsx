/**
 * Trend Line Chart
 * Displays time series data with trend analysis
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendPoint {
  date: string;
  value: number;
  metric: string;
  change?: number;
}

interface TrendLineChartProps {
  data: TrendPoint[];
  height?: number;
  showTrend?: boolean;
  color?: string;
  className?: string;
}

export function TrendLineChart({ 
  data, 
  height = 300, 
  showTrend = true, 
  color = '#8884d8',
  className 
}: TrendLineChartProps) {
  // Calculate trend
  const calculateTrend = () => {
    if (data.length < 2) return { direction: 'stable', percentage: 0 };
    
    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const percentage = ((lastValue - firstValue) / firstValue) * 100;
    
    if (Math.abs(percentage) < 5) return { direction: 'stable', percentage };
    return { 
      direction: percentage > 0 ? 'up' : 'down', 
      percentage: Math.abs(percentage) 
    };
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{formatDate(label)}</p>
          <p className="text-sm">
            <span className="font-medium" style={{ color }}>
              {data.metric}: {payload[0].value.toLocaleString()}
            </span>
          </p>
          {data.change !== undefined && (
            <p className="text-xs text-muted-foreground">
              Change: {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const trend = calculateTrend();
  const average = data.reduce((sum, point) => sum + point.value, 0) / data.length;

  return (
    <div className={className}>
      {showTrend && data.length > 1 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            {trend.direction === 'up' && (
              <>
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">
                  Trending up {trend.percentage.toFixed(1)}%
                </span>
              </>
            )}
            {trend.direction === 'down' && (
              <>
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">
                  Trending down {trend.percentage.toFixed(1)}%
                </span>
              </>
            )}
            {trend.direction === 'stable' && (
              <>
                <Minus className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600">Stable</span>
              </>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Avg: {average.toLocaleString()}
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#666"
            fontSize={12}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Average reference line */}
          <ReferenceLine 
            y={average} 
            stroke="#ddd" 
            strokeDasharray="5 5"
            label={{ value: "Avg", position: "insideTopRight" }}
          />
          
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Data Summary */}
      <div className="grid grid-cols-3 gap-4 mt-4 text-center">
        <div>
          <div className="text-lg font-semibold">
            {Math.max(...data.map(d => d.value)).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Peak</div>
        </div>
        <div>
          <div className="text-lg font-semibold">
            {Math.min(...data.map(d => d.value)).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">Low</div>
        </div>
        <div>
          <div className="text-lg font-semibold">
            {data.length}
          </div>
          <div className="text-xs text-muted-foreground">Data Points</div>
        </div>
      </div>
    </div>
  );
}