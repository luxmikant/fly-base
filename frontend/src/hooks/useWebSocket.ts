import { useEffect, useRef, useState } from 'react';
import { wsClient, TelemetryData, DroneStatus, Alert } from '../lib/websocket';
import { apiClient } from '../lib/api';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const token = apiClient.loadToken();
    if (!token) return;

    const connect = async () => {
      try {
        await wsClient.connect(token);
        setIsConnected(true);
        setConnectionError(null);
      } catch (error) {
        setIsConnected(false);
        setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        
        // Retry connection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    };

    connect();

    // Listen for auth expiration
    const handleAuthExpired = () => {
      wsClient.disconnect();
      setIsConnected(false);
    };

    window.addEventListener('auth:expired', handleAuthExpired);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      window.removeEventListener('auth:expired', handleAuthExpired);
      wsClient.disconnect();
    };
  }, []);

  return {
    isConnected,
    connectionError,
    wsClient,
  };
}

export function useMissionTelemetry(missionId: string | null) {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const { wsClient: client } = useWebSocket();

  useEffect(() => {
    if (!missionId || !client.isConnected()) return;

    const handleTelemetryUpdate = (data: TelemetryData) => {
      setTelemetry(data);
    };

    client.subscribeToMission(missionId, handleTelemetryUpdate);

    return () => {
      client.unsubscribeFromMission(missionId);
    };
  }, [missionId, client]);

  return telemetry;
}

export function useDroneStatus(droneId: string | null) {
  const [status, setStatus] = useState<DroneStatus | null>(null);
  const { wsClient: client } = useWebSocket();

  useEffect(() => {
    if (!droneId || !client.isConnected()) return;

    const handleStatusUpdate = (data: DroneStatus) => {
      setStatus(data);
    };

    client.subscribeToDrone(droneId, handleStatusUpdate);

    return () => {
      // Note: We don't unsubscribe here as multiple components might use the same drone
    };
  }, [droneId, client]);

  return status;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const { wsClient: client } = useWebSocket();

  useEffect(() => {
    if (!client.isConnected()) return;

    const handleAlert = (alert: Alert) => {
      setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
    };

    client.subscribeToAlerts(handleAlert);

    return () => {
      // Alerts are global, don't unsubscribe
    };
  }, [client]);

  const clearAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  return {
    alerts,
    clearAlert,
    clearAllAlerts,
  };
}