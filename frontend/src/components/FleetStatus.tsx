import { motion } from 'framer-motion';

interface FleetStatusProps {
  available: number;
  inMission: number;
  charging: number;
  maintenance: number;
}

export function FleetStatus({ available, inMission, charging, maintenance }: FleetStatusProps) {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="bg-[#2D3748] rounded border border-white/10 p-4"
    >
      <h3 className="text-[#00FF88] tracking-tight mb-4 border-b border-white/10 pb-2">
        FLEET STATUS
      </h3>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
          <span className="text-xs text-[#A0AEC0]">Available</span>
          <span className="ml-auto mono text-sm text-white">{available}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#4299E1] animate-pulse" />
          <span className="text-xs text-[#A0AEC0]">In Mission</span>
          <span className="ml-auto mono text-sm text-white">{inMission}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#FFB800]" />
          <span className="text-xs text-[#A0AEC0]">Charging</span>
          <span className="ml-auto mono text-sm text-white">{charging}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#FF3366]" />
          <span className="text-xs text-[#A0AEC0]">Maintenance</span>
          <span className="ml-auto mono text-sm text-white">{maintenance}</span>
        </div>
      </div>
    </motion.div>
  );
}
