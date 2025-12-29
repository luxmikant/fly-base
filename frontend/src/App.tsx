import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/LoginForm';
import { NavigationRail } from './components/NavigationRail';
import { LiveMap } from './components/LiveMap';
import { MissionControl } from './components/MissionControl';
import { FleetStatus } from './components/FleetStatus';
import { Telemetry } from './components/Telemetry';
import { RecentAlerts } from './components/RecentAlerts';
import { DroneStatusCard } from './components/DroneStatusCard';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { useWebSocket, useAlerts, useMissionTelemetry } from './hooks/useWebSocket';
import { useMissions } from './hooks/useMissions';
import { useDrones, useFleetStatus } from './hooks/useDrones';

interface Alert {
  id: string;
  type: 'warning' | 'success' | 'info';
  message: string;
  drone?: string;
  timestamp: Date;
}

function Dashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('missions');
  
  // Site ID from environment or user context
  const siteId = import.meta.env.VITE_DEFAULT_SITE_ID || 'site-sf-01';
  
  // WebSocket connection and real-time data
  const { isConnected } = useWebSocket();
  const { alerts } = useAlerts();
  const telemetryData = useMissionTelemetry(activeMissionId);
  
  // API data hooks
  const { missions, loading: missionsLoading, startMission, pauseMission, abortMission, returnToHome } = useMissions(siteId);
  const { drones, loading: dronesLoading } = useDrones(siteId);
  const { fleetStatus } = useFleetStatus(siteId);

  // Find active mission (with null safety)
  const activeMission = missions?.find(m => m.status === 'ACTIVE');
  
  useEffect(() => {
    if (activeMission && activeMission.id !== activeMissionId) {
      setActiveMissionId(activeMission.id);
    } else if (!activeMission && activeMissionId) {
      setActiveMissionId(null);
    }
  }, [activeMission, activeMissionId]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock telemetry data when no real data is available
  const displayTelemetry = telemetryData || {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 120.5,
    speed: 5.2,
    heading: 270,
    battery: 78,
    signal: 85,
  };

  // Convert drones to map format
  const mapDrones = drones.map(drone => ({
    id: drone.id,
    position: drone.currentLocation || { lat: 37.7749, lng: -122.4194 },
    status: drone.status.toLowerCase() as 'active' | 'idle' | 'charging' | 'maintenance',
    battery: drone.batteryLevel,
  }));

  const handleStartMission = async () => {
    if (activeMission) {
      try {
        await startMission(activeMission.id);
      } catch (error) {
        console.error('Failed to start mission:', error);
      }
    }
  };

  const handlePauseMission = async () => {
    if (activeMission) {
      try {
        await pauseMission(activeMission.id);
      } catch (error) {
        console.error('Failed to pause mission:', error);
      }
    }
  };

  const handleAbortMission = async () => {
    if (activeMission) {
      try {
        await abortMission(activeMission.id);
      } catch (error) {
        console.error('Failed to abort mission:', error);
      }
    }
  };

  const handleRTH = async () => {
    if (activeMission) {
      try {
        await returnToHome(activeMission.id);
      } catch (error) {
        console.error('Failed to execute RTH:', error);
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  const missionStatus = activeMission?.status.toLowerCase() as 'idle' | 'active' | 'paused' | 'completed' || 'idle';
  const progress = activeMission?.progress || 0;
  const eta = activeMission && missionStatus === 'active' 
    ? `${Math.floor((100 - progress) * 0.2)}m ${Math.floor(((100 - progress) * 0.2 % 1) * 60)}s` 
    : '--';

  // Render different views based on navigation
  const renderMainContent = () => {
    switch (currentView) {
      case 'analytics':
        return (
          <div className="p-6">
            <AnalyticsDashboard />
          </div>
        );
      case 'missions':
      default:
        return (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00FF88] animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-sm text-[#A0AEC0]">SITE:</span>
                  <span className="mono">{siteId.toUpperCase()}</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#A0AEC0]">USER:</span>
                  <span className="mono">{user?.name?.toUpperCase() || 'UNKNOWN'}</span>
                </div>
                {!isConnected && (
                  <>
                    <div className="w-px h-4 bg-white/20" />
                    <span className="text-sm text-red-400">OFFLINE</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="mono text-[#00FF88]">{formatTime(currentTime)} UTC</span>
              </div>
            </div>

            {/* Loading State */}
            {(missionsLoading || dronesLoading) && (
              <div className="flex items-center justify-center py-12">
                <div className="text-[#A0AEC0]">Loading mission data...</div>
              </div>
            )}

            {/* Main Grid */}
            {!missionsLoading && !dronesLoading && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Left Column - Map and Fleet/Telemetry */}
                <div className="xl:col-span-8 space-y-6">
                  <LiveMap 
                    drones={mapDrones} 
                    center={{ 
                      lat: parseFloat(import.meta.env.VITE_MAP_DEFAULT_CENTER_LAT) || 37.7749, 
                      lng: parseFloat(import.meta.env.VITE_MAP_DEFAULT_CENTER_LNG) || -122.4194 
                    }} 
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FleetStatus 
                      available={fleetStatus?.available || 0}
                      inMission={fleetStatus?.inMission || 0}
                      charging={fleetStatus?.charging || 0}
                      maintenance={fleetStatus?.maintenance || 0}
                    />
                    <Telemetry
                      latitude={displayTelemetry.latitude}
                      longitude={displayTelemetry.longitude}
                      altitude={displayTelemetry.altitude}
                      speed={displayTelemetry.speed}
                      heading={displayTelemetry.heading}
                      battery={displayTelemetry.battery}
                      signal={displayTelemetry.signal}
                    />
                  </div>
                </div>

                {/* Right Column - Mission Control and Alerts */}
                <div className="xl:col-span-4 space-y-6">
                  <MissionControl
                    missionStatus={missionStatus}
                    progress={progress}
                    eta={eta}
                    battery={displayTelemetry.battery}
                    altitude={displayTelemetry.altitude}
                    speed={displayTelemetry.speed}
                    onStart={handleStartMission}
                    onPause={handlePauseMission}
                    onAbort={handleAbortMission}
                    onRTH={handleRTH}
                  />
                  <RecentAlerts alerts={alerts} />
                </div>
              </div>
            )}

            {/* Drone Status Cards */}
            {!dronesLoading && drones.length > 0 && (
              <div className="mt-6">
                <h2 className="text-[#00FF88] mb-4 tracking-tight">ACTIVE FLEET</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {drones.slice(0, 6).map((drone) => (
                    <DroneStatusCard
                      key={drone.id}
                      droneId={drone.id}
                      status={drone.status.toLowerCase() as any}
                      battery={drone.batteryLevel}
                      voltage={12.4} // Mock voltage
                      signal={85} // Mock signal
                      signalStrength={-67} // Mock signal strength
                      position={drone.currentLocation || { lat: 37.7749, lng: -122.4194 }}
                      altitude={120.5} // Mock altitude
                      heading={270} // Mock heading
                      speed={5.2} // Mock speed
                      lastUpdate={drone.lastSeen ? new Date(drone.lastSeen).toLocaleString() : '1m ago'}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1D23] text-white overflow-hidden">
      <NavigationRail activeItem={currentView} onNavigate={setCurrentView} />

      {/* Main Content */}
      <div className="ml-[60px]">
        {renderMainContent()}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1D23] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <Dashboard />;
}

export default App;