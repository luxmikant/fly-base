import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Alert {
  id: string;
  type: 'warning' | 'success' | 'info';
  message: string;
  drone?: string;
  timestamp: Date;
}

interface RecentAlertsProps {
  alerts: Alert[];
}

export function RecentAlerts({ alerts }: RecentAlertsProps) {
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[#FFB800]" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-[#00FF88]" />;
      case 'info':
        return <Info className="w-4 h-4 text-[#4299E1]" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="bg-[#2D3748] rounded border border-white/10 p-4"
    >
      <h3 className="text-[#00FF88] tracking-tight mb-4 border-b border-white/10 pb-2">
        RECENT ALERTS
      </h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center text-[#A0AEC0] text-xs py-4">No alerts</div>
        ) : (
          alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-2 p-2 rounded bg-black/20 border border-white/5"
            >
              <div className="flex-shrink-0 mt-0.5">{getAlertIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white">{alert.message}</div>
                {alert.drone && (
                  <div className="text-xs text-[#4299E1] mono mt-0.5">{alert.drone}</div>
                )}
                <div className="text-xs text-[#A0AEC0] mt-1">
                  {getTimeAgo(alert.timestamp)}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
