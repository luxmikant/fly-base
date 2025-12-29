import { motion } from 'framer-motion';
import { MapPin, Compass, Zap, Battery, Signal } from 'lucide-react';

interface DroneStatusCardProps {
  droneId: string;
  status: 'active' | 'idle' | 'charging' | 'maintenance';
  battery: number;
  voltage: number;
  signal: number;
  signalStrength: number;
  position: { lat: number; lng: number };
  altitude: number;
  heading: number;
  speed: number;
  lastUpdate: string;
  onViewDetails?: () => void;
}

export function DroneStatusCard({
  droneId,
  status,
  battery,
  voltage,
  signal,
  signalStrength,
  position,
  altitude,
  heading,
  speed,
  lastUpdate,
  onViewDetails,
}: DroneStatusCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return '#00FF88';
      case 'idle':
        return '#FFB800';
      case 'charging':
        return '#9F7AEA';
      case 'maintenance':
        return '#FF3366';
    }
  };

  const getStatusLabel = () => {
    return status.toUpperCase();
  };

  const getBatteryColor = () => {
    if (battery > 50) return '#00FF88';
    if (battery > 20) return '#FFB800';
    return '#FF3366';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: '0 8px 24px rgba(0, 255, 136, 0.15)' }}
      transition={{ duration: 0.3 }}
      className="bg-[#2D3748] rounded border border-white/10 p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
        <h3 className="mono tracking-tight">{droneId}</h3>
        <div
          className="flex items-center gap-2 px-2 py-1 rounded text-xs"
          style={{
            backgroundColor: `${getStatusColor()}20`,
            color: getStatusColor(),
          }}
        >
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: getStatusColor() }}
          />
          {getStatusLabel()}
        </div>
      </div>

      {/* Battery and Signal */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#A0AEC0] mb-2">
            <Battery className="w-3 h-3" />
            Battery
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: getBatteryColor() }}
                initial={{ width: 0 }}
                animate={{ width: `${battery}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="mono text-xs" style={{ color: getBatteryColor() }}>
              {battery}%
            </span>
          </div>
          <div className="mono text-xs text-[#A0AEC0] mt-1">{voltage}V</div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs text-[#A0AEC0] mb-2">
            <Signal className="w-3 h-3" />
            Signal
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-black/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#4299E1]"
                initial={{ width: 0 }}
                animate={{ width: `${signal}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="mono text-xs text-[#4299E1]">{signal}%</span>
          </div>
          <div className="mono text-xs text-[#A0AEC0] mt-1">{signalStrength}dBm</div>
        </div>
      </div>

      {/* Telemetry */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-[#4299E1]" />
          <div>
            <div className="mono text-xs text-white">
              {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Compass className="w-3 h-3 text-[#00FF88]" />
          <div className="mono text-xs text-white">{altitude}m</div>
        </div>

        <div className="flex items-center gap-2">
          <Compass className="w-3 h-3 text-[#ED8936]" />
          <div className="mono text-xs text-white">{heading}° NW</div>
        </div>

        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-[#9F7AEA]" />
          <div className="mono text-xs text-white">{speed}m/s</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <span className="text-xs text-[#A0AEC0]">Last Update: {lastUpdate}</span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onViewDetails}
          className="text-xs text-[#00FF88] hover:text-[#00FF88]/80 transition-colors"
        >
          VIEW DETAILS
        </motion.button>
      </div>
    </motion.div>
  );
}
