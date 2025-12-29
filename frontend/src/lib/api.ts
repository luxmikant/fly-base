import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface Mission {
  id: string;
  name: string;
  status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABORTED';
  droneId: string;
  siteId: string;
  progress?: number;
  estimatedDuration?: number;
  estimatedDistance?: number;
  createdAt: Date;
  scheduledStart?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Drone {
  id: string;
  model: string;
  serialNumber: string;
  status: 'IDLE' | 'ACTIVE' | 'CHARGING' | 'MAINTENANCE' | 'ERROR';
  batteryLevel: number;
  currentLocation?: { lat: number; lng: number };
  lastSeen?: Date;
  siteId: string;
}

export interface CreateMissionRequest {
  name: string;
  siteId: string;
  droneId: string;
  surveyArea: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  flightPattern: 'GRID' | 'CIRCULAR' | 'WAYPOINT' | 'PERIMETER';
  parameters: {
    altitude: number;
    speed: number;
    overlap: number;
    gimbalAngle?: number;
  };
  scheduledStart?: string;
}

export interface FleetStatus {
  available: number;
  inMission: number;
  charging: number;
  maintenance: number;
  total: number;
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          // Redirect to login or emit auth error event
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  loadToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  // Auth endpoints
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await this.client.post('/auth/login', { email, password });
    const { token } = response.data;
    this.setToken(token);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  // Mission endpoints
  async createMission(mission: CreateMissionRequest): Promise<Mission> {
    const response = await this.client.post('/missions', mission);
    return response.data;
  }

  async getMissions(params?: {
    page?: number;
    limit?: number;
    siteId?: string;
    status?: string;
  }): Promise<{ missions: Mission[]; pagination: any }> {
    const response = await this.client.get('/missions', { params });
    return response.data;
  }

  async getMission(id: string): Promise<Mission> {
    const response = await this.client.get(`/missions/${id}`);
    return response.data;
  }

  async startMission(id: string): Promise<any> {
    const response = await this.client.post(`/missions/${id}/start`);
    return response.data;
  }

  async pauseMission(id: string): Promise<any> {
    const response = await this.client.post(`/missions/${id}/pause`);
    return response.data;
  }

  async resumeMission(id: string): Promise<any> {
    const response = await this.client.post(`/missions/${id}/resume`);
    return response.data;
  }

  async abortMission(id: string): Promise<any> {
    const response = await this.client.post(`/missions/${id}/abort`);
    return response.data;
  }

  async returnToHome(id: string): Promise<any> {
    const response = await this.client.post(`/missions/${id}/rth`);
    return response.data;
  }

  async getMissionTelemetry(id: string): Promise<any> {
    const response = await this.client.get(`/missions/${id}/telemetry`);
    return response.data;
  }

  // Drone endpoints
  async getDrones(params?: {
    page?: number;
    limit?: number;
    siteId?: string;
    status?: string;
  }): Promise<{ drones: Drone[]; pagination: any }> {
    const response = await this.client.get('/drones', { params });
    return response.data;
  }

  async getDrone(id: string): Promise<Drone> {
    const response = await this.client.get(`/drones/${id}`);
    return response.data;
  }

  async getFleetStatus(siteId: string): Promise<FleetStatus> {
    const response = await this.client.get(`/drones/site/${siteId}/fleet-status`);
    return response.data;
  }

  async getAvailableDrones(siteId: string, minBattery = 30): Promise<Drone[]> {
    const response = await this.client.get(`/drones/site/${siteId}/available`, {
      params: { minBattery },
    });
    return response.data;
  }

  async getNearbyDrones(lat: number, lon: number, radius = 10): Promise<Drone[]> {
    const response = await this.client.get('/drones/nearby', {
      params: { lat, lon, radius },
    });
    return response.data;
  }
}

// Singleton instance
export const apiClient = new ApiClient(
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
);