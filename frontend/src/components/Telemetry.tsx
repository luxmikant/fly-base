import { motion } from 'framer-motion';
import { MapPin, Compass, Activity, Wifi } from 'lucide-react';

interface TelemetryProps {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  battery: number;
  signal: number;
}

export function Telemetry({
  latitude,
  longitude,
  altitude,
  speed,
  heading,
  battery,
  signal,
}: TelemetryProps) {
  const getHeadingDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(deg / 45) % 8];
  };

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="bg-[#2D3748] rounded border border-white/10 p-4"
    >
      <h3 className="text-[#00FF88] tracking-tight mb-4 border-b border-white/10 pb-2">
        TELEMETRY
      </h3>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-[#4299E1] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#A0AEC0]">LAT</div>
            <div className="mono text-sm text-white truncate">{latitude.toFixed(6)}</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-[#4299E1] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#A0AEC0]">LON</div>
            <div className="mono text-sm text-white truncate">{longitude.toFixed(6)}</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Activity className="w-4 h-4 text-[#9F7AEA] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-[#A0AEC0]">ALT</div>
            <div className="mono text-sm text-white">{altitude.toFixed(1)}m</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Activity className="w-4 h-4 text-[#ED8936] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-[#A0AEC0]">SPD</div>
            <div className="mono text-sm text-white">{speed.toFixed(1)}m/s</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Compass className="w-4 h-4 text-[#00FF88] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-[#A0AEC0]">HDG</div>
            <div className="mono text-sm text-white">
              {heading}° {getHeadingDirection(heading)}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Activity className="w-4 h-4 text-[#FFB800] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-[#A0AEC0]">BAT</div>
            <div className="mono text-sm text-white">{battery}%</div>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Wifi className="w-4 h-4 text-[#4299E1] mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-[#A0AEC0]">SIG</div>
            <div className="mono text-sm text-white">{signal}%</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
