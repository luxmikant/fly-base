import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Plane, BarChart3, Settings, User } from 'lucide-react';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface NavigationRailProps {
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
}

const navItems: NavItem[] = [
  { id: 'missions', icon: <Crosshair className="w-6 h-6" />, label: 'Missions' },
  { id: 'fleet', icon: <Plane className="w-6 h-6" />, label: 'Fleet' },
  { id: 'analytics', icon: <BarChart3 className="w-6 h-6" />, label: 'Analytics' },
  { id: 'settings', icon: <Settings className="w-6 h-6" />, label: 'Settings' },
  { id: 'profile', icon: <User className="w-6 h-6" />, label: 'Profile' },
];

export function NavigationRail({ activeItem = 'missions', onNavigate }: NavigationRailProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleItemClick = (itemId: string) => {
    if (onNavigate) {
      onNavigate(itemId);
    }
  };

  return (
    <motion.div
      className="fixed left-0 top-0 h-full bg-[#151820] border-r border-white/10 flex flex-col items-start py-6 z-50"
      initial={{ width: 60 }}
      animate={{ width: isExpanded ? 200 : 60 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="w-full px-3 mb-8">
        <div className="h-10 flex items-center justify-center">
          <div className="w-8 h-8 bg-[#00FF88] rounded-sm flex items-center justify-center">
            <span className="text-[#1A1D23] font-bold text-sm">FB</span>
          </div>
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="ml-3 tracking-tight"
            >
              FlytBase
            </motion.span>
          )}
        </div>
      </div>

      <div className="w-full flex-1 space-y-2 px-2">
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={`w-full h-12 flex items-center px-2 rounded transition-colors ${
              activeItem === item.id
                ? 'bg-[#00FF88]/10 text-[#00FF88]'
                : 'text-[#A0AEC0] hover:bg-white/5 hover:text-white'
            }`}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              {item.icon}
            </div>
            {isExpanded && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
                className="ml-3 whitespace-nowrap"
              >
                {item.label}
              </motion.span>
            )}
            {activeItem === item.id && (
              <motion.div
                layoutId="activeIndicator"
                className="absolute right-0 w-1 h-8 bg-[#00FF88] rounded-l"
              />
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
