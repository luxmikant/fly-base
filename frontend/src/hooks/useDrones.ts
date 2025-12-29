import { useState, useEffect, useCallback } from 'react';
import { apiClient, Drone, FleetStatus } from '../lib/api';

export function useDrones(siteId?: string) {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getDrones({ siteId, limit: 100 });
      setDrones(response.drones);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch drones');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchDrones();
  }, [fetchDrones]);

  return {
    drones,
    loading,
    error,
    refetch: fetchDrones,
  };
}

export function useFleetStatus(siteId: string) {
  const [fleetStatus, setFleetStatus] = useState<FleetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFleetStatus = useCallback(async () => {
    try {
      setLoading(true);
      const status = await apiClient.getFleetStatus(siteId);
      setFleetStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fleet status');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchFleetStatus();
    
    // Refresh fleet status every 30 seconds
    const interval = setInterval(fetchFleetStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchFleetStatus]);

  return {
    fleetStatus,
    loading,
    error,
    refetch: fetchFleetStatus,
  };
}

export function useAvailableDrones(siteId: string, minBattery = 30) {
  const [availableDrones, setAvailableDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableDrones = useCallback(async () => {
    try {
      setLoading(true);
      const drones = await apiClient.getAvailableDrones(siteId, minBattery);
      setAvailableDrones(drones);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch available drones');
    } finally {
      setLoading(false);
    }
  }, [siteId, minBattery]);

  useEffect(() => {
    fetchAvailableDrones();
  }, [fetchAvailableDrones]);

  return {
    availableDrones,
    loading,
    error,
    refetch: fetchAvailableDrones,
  };
}