import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Layers } from 'lucide-react';

interface Drone {
  id: string;
  position: { lat: number; lng: number };
  status: 'active' | 'idle' | 'charging';
  battery: number;
}

interface LiveMapProps {
  drones: Drone[];
  center: { lat: number; lng: number };
}

export function LiveMap({ drones, center }: LiveMapProps) {
  const [mapType, setMapType] = useState<'satellite' | 'terrain'>('satellite');

  // Convert lat/lng to pixel positions for simple visualization
  const latLngToPixel = (lat: number, lng: number) => {
    // Simple mercator projection approximation
    const x = ((lng + 180) / 360) * 100;
    const y = ((90 - lat) / 180) * 100;
    return { x: `${x}%`, y: `${y}%` };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-[#2D3748] rounded border border-white/10 overflow-hidden relative h-[500px]"
    >
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMapType('satellite')}
          className={`px-3 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
            mapType === 'satellite'
              ? 'bg-[#00FF88] text-[#1A1D23]'
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
        >
          <Layers className="w-3 h-3" />
          Satellite
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMapType('terrain')}
          className={`px-3 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
            mapType === 'terrain'
              ? 'bg-[#00FF88] text-[#1A1D23]'
              : 'bg-black/50 text-white hover:bg-black/70'
          }`}
        >
          <Layers className="w-3 h-3" />
          Terrain
        </motion.button>
      </div>

      {/* Mock Map Background */}
      <div
        className={`absolute inset-0 ${
          mapType === 'satellite' ? 'bg-[#1a2332]' : 'bg-[#2d3a2e]'
        }`}
      >
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 255, 136, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />

        {/* Flight path visualization */}
        <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
          {/* Survey area polygon */}
          <motion.polygon
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 0.5 }}
            points="20,20 80,20 80,80 20,80"
            fill="rgba(237, 137, 54, 0.1)"
            stroke="#ED8936"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="animate-pulse"
          />

          {/* Planned flight path */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
            d="M 30 30 L 70 30 L 70 70 L 30 70 L 30 40 L 70 40 L 70 60 L 30 60"
            fill="none"
            stroke="#ED8936"
            strokeWidth="2"
            strokeDasharray="10,5"
            opacity="0.6"
          />
        </svg>

        {/* Drone markers */}
        {drones.map((drone, index) => {
          const pos = latLngToPixel(drone.position.lat, drone.position.lng);
          const statusColor =
            drone.status === 'active'
              ? '#00FF88'
              : drone.status === 'idle'
              ? '#FFB800'
              : '#A0AEC0';

          return (
            <motion.div
              key={drone.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7 + index * 0.1, type: 'spring' }}
              className="absolute"
              style={{
                left: pos.x,
                top: pos.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Pulse effect for active drones */}
              {drone.status === 'active' && (
                <motion.div
                  animate={{
                    scale: [1, 2, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="absolute w-8 h-8 rounded-full"
                  style={{ backgroundColor: statusColor }}
                />
              )}

              {/* Drone icon */}
              <div
                className="relative w-8 h-8 rounded-full flex items-center justify-center border-2"
                style={{ backgroundColor: statusColor, borderColor: statusColor }}
              >
                <MapPin className="w-4 h-4 text-[#1A1D23]" />
              </div>

              {/* Drone info tooltip */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm rounded px-2 py-1 whitespace-nowrap text-xs border border-white/10"
              >
                <div className="text-white mono">{drone.id}</div>
                <div className="text-[#A0AEC0]">Battery: {drone.battery}%</div>
              </motion.div>
            </motion.div>
          );
        })}

        {/* Home base marker */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, type: 'spring' }}
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-10 h-10 rounded-full bg-[#4299E1] border-2 border-white flex items-center justify-center">
            <span className="text-white">H</span>
          </div>
        </motion.div>
      </div>

      {/* Map coordinates overlay */}
      <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded px-3 py-2 text-xs mono text-white border border-white/10">
        Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
      </div>
    </motion.div>
  );
}
