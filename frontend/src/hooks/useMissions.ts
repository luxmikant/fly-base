import { useState, useEffect, useCallback } from 'react';
import { apiClient, Mission, CreateMissionRequest } from '../lib/api';

export function useMissions(siteId?: string) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMissions({ siteId, limit: 50 });
      setMissions(response.missions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch missions');
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const createMission = async (missionData: CreateMissionRequest): Promise<Mission> => {
    const mission = await apiClient.createMission(missionData);
    setMissions(prev => [mission, ...prev]);
    return mission;
  };

  const startMission = async (id: string) => {
    await apiClient.startMission(id);
    await fetchMissions(); // Refresh to get updated status
  };

  const pauseMission = async (id: string) => {
    await apiClient.pauseMission(id);
    await fetchMissions();
  };

  const resumeMission = async (id: string) => {
    await apiClient.resumeMission(id);
    await fetchMissions();
  };

  const abortMission = async (id: string) => {
    await apiClient.abortMission(id);
    await fetchMissions();
  };

  const returnToHome = async (id: string) => {
    await apiClient.returnToHome(id);
  };

  return {
    missions,
    loading,
    error,
    refetch: fetchMissions,
    createMission,
    startMission,
    pauseMission,
    resumeMission,
    abortMission,
    returnToHome,
  };
}

export function useMission(id: string | null) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchMission = async () => {
      try {
        setLoading(true);
        const missionData = await apiClient.getMission(id);
        setMission(missionData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch mission');
      } finally {
        setLoading(false);
      }
    };

    fetchMission();
  }, [id]);

  return { mission, loading, error };
}