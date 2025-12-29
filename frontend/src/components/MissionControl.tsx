import { motion } from 'framer-motion';
import { Play, Pause, Square, Home, Navigation } from 'lucide-react';
import { Progress } from './ui/progress';

interface MissionControlProps {
  missionStatus: 'idle' | 'active' | 'paused' | 'completed';
  progress: number;
  eta: string;
  battery: number;
  altitude: number;
  speed: number;
  onStart?: () => void;
  onPause?: () => void;
  onAbort?: () => void;
  onRTH?: () => void;
}

export function MissionControl({
  missionStatus,
  progress,
  eta,
  battery,
  altitude,
  speed,
  onStart,
  onPause,
  onAbort,
  onRTH,
}: MissionControlProps) {
  const getBatteryColor = () => {
    if (battery > 50) return '#00FF88';
    if (battery > 20) return '#FFB800';
    return '#FF3366';
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="bg-[#2D3748] rounded border border-white/10 p-4 space-y-4"
    >
      <h3 className="text-[#00FF88] tracking-tight border-b border-white/10 pb-2">
        MISSION CTRL
      </h3>

      <div className="space-y-2">
        <motion.button
          whileHover={{ scale: 1.02, y: -2, boxShadow: '0 0 16px rgba(0, 255, 136, 0.4)' }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          disabled={missionStatus === 'active'}
          className="w-full bg-[#00FF88] text-[#1A1D23] py-3 px-4 rounded flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Play className="w-4 h-4" />
          START MISSION
        </motion.button>

        <div className="grid grid-cols-3 gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPause}
            disabled={missionStatus !== 'active'}
            className="bg-[#FFB800] text-[#1A1D23] py-2 px-3 rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Pause className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onAbort}
            disabled={missionStatus === 'idle'}
            className="bg-[#FF3366] text-white py-2 px-3 rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Square className="w-4 h-4" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRTH}
            disabled={missionStatus === 'idle'}
            className="bg-[#4299E1] text-white py-2 px-3 rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Home className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-white/10">
        <div>
          <div className="flex justify-between text-xs text-[#A0AEC0] mb-1">
            <span>PROGRESS</span>
            <span className="mono">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div>
          <div className="flex justify-between text-xs text-[#A0AEC0]">
            <span>ETA</span>
            <span className="mono text-[#00FF88]">{eta}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#A0AEC0]">BATTERY</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-black/30 rounded-full overflow-hidden">
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
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#A0AEC0]">ALTITUDE</span>
          <div className="flex items-center gap-2">
            <Navigation className="w-3 h-3 text-[#4299E1]" />
            <span className="mono text-xs text-white">{altitude}m</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#A0AEC0]">SPEED</span>
          <span className="mono text-xs text-white">{speed}m/s</span>
        </div>
      </div>
    </motion.div>
  );
}
