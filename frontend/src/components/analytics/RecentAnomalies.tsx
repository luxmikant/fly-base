/**
 * Recent Anomalies Component
 * Displays recent performance anomalies and alerts
 */

import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  Clock,
  Wrench,
  Battery,
  TrendingDown,
  Activity
} from 'lucide-react';

interface Anomaly {
  type: string;
  severity: string;
  droneId?: string;
  serialNumber?: string;
  description: string;
  value?: number;
  threshold?: number;
  timestamp?: string;
}

interface RecentAnomaliesProps {
  anomalies: Anomaly[];
  maxItems?: number;
  showActions?: boolean;
  className?: string;
}

export function RecentAnomalies({ 
  anomalies, 
  maxItems = 5, 
  showActions = true,
  className 
}: RecentAnomaliesProps) {
  // Get icon for anomaly type
  const getAnomalyIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'maintenance_due':
      case 'maintenance':
        return <Wrench className="h-4 w-4" />;
      case 'battery_issue':
      case 'battery':
        return <Battery className="h-4 w-4" />;
      case 'performance_degradation':
      case 'performance':
        return <TrendingDown className="h-4 w-4" />;
      case 'utilization_low':
      case 'utilization_high':
      case 'utilization':
        return <Activity className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Get severity color and icon
  const getSeverityConfig = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return {
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: <AlertTriangle className="h-3 w-3" />,
          bgColor: 'bg-red-50 border-red-200'
        };
      case 'warning':
      case 'high':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <AlertTriangle className="h-3 w-3" />,
          bgColor: 'bg-yellow-50 border-yellow-200'
        };
      case 'medium':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: <AlertCircle className="h-3 w-3" />,
          bgColor: 'bg-orange-50 border-orange-200'
        };
      case 'info':
      case 'low':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <Info className="h-3 w-3" />,
          bgColor: 'bg-blue-50 border-blue-200'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: <Info className="h-3 w-3" />,
          bgColor: 'bg-gray-50 border-gray-200'
        };
    }
  };

  // Format anomaly type for display
  const formatAnomalyType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format timestamp
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Recently';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Handle anomaly action
  const handleAnomalyAction = (anomaly: Anomaly, action: 'view' | 'resolve') => {
    // In a real app, this would navigate to detailed view or mark as resolved
    console.log(`${action} anomaly:`, anomaly);
  };

  const displayedAnomalies = anomalies.slice(0, maxItems);

  if (displayedAnomalies.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <Activity className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm font-medium text-green-600">All systems normal</p>
          <p className="text-xs text-muted-foreground">No anomalies detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {displayedAnomalies.map((anomaly, index) => {
        const severityConfig = getSeverityConfig(anomaly.severity);
        
        return (
          <div key={index}>
            <div className={`p-3 rounded-lg border ${severityConfig.bgColor}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getAnomalyIcon(anomaly.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge className={severityConfig.color}>
                        {severityConfig.icon}
                        <span className="ml-1">{anomaly.severity.toUpperCase()}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(anomaly.timestamp)}
                      </span>
                    </div>
                    
                    <h4 className="text-sm font-medium mb-1">
                      {formatAnomalyType(anomaly.type)}
                      {anomaly.serialNumber && (
                        <span className="text-muted-foreground ml-1">
                          - {anomaly.serialNumber}
                        </span>
                      )}
                    </h4>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {anomaly.description}
                    </p>

                    {/* Value and threshold info */}
                    {anomaly.value !== undefined && anomaly.threshold !== undefined && (
                      <div className="flex items-center space-x-4 text-xs">
                        <span>
                          <span className="text-muted-foreground">Current:</span>{' '}
                          <span className="font-medium">{anomaly.value.toFixed(1)}</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Threshold:</span>{' '}
                          <span className="font-medium">{anomaly.threshold.toFixed(1)}</span>
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    {showActions && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleAnomalyAction(anomaly, 'view')}
                        >
                          View Details
                        </Button>
                        {anomaly.severity.toLowerCase() !== 'info' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleAnomalyAction(anomaly, 'resolve')}
                          >
                            Mark Resolved
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {index < displayedAnomalies.length - 1 && (
              <Separator className="my-2" />
            )}
          </div>
        );
      })}

      {/* Show more link */}
      {anomalies.length > maxItems && (
        <div className="text-center pt-2">
          <Button variant="ghost" size="sm" className="text-xs">
            View {anomalies.length - maxItems} more anomalies
          </Button>
        </div>
      )}

      {/* Summary stats */}
      {anomalies.length > 0 && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-red-600">
                {anomalies.filter(a => a.severity.toLowerCase() === 'critical').length}
              </div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-yellow-600">
                {anomalies.filter(a => ['warning', 'high'].includes(a.severity.toLowerCase())).length}
              </div>
              <div className="text-xs text-muted-foreground">Warning</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {anomalies.filter(a => ['info', 'low'].includes(a.severity.toLowerCase())).length}
              </div>
              <div className="text-xs text-muted-foreground">Info</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}