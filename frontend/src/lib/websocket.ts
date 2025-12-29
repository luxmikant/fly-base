import { io, Socket } from 'socket.io-client';

export interface TelemetryData {
  droneId: string;
  missionId?: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  battery: number;
  signal: number;
  timestamp: Date;
}

export interface DroneStatus {
  droneId: string;
  status: 'idle' | 'active' | 'charging' | 'maintenance' | 'error';
  battery: number;
  position: { lat: number; lng: number };
  lastUpdate: Date;
}

export interface Alert {
  id: string;
  type: 'warning' | 'success' | 'info' | 'error';
  message: string;
  drone?: string;
  timestamp: Date;
}

export class WebSocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(private url: string) {}

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.token = token;
      
      this.socket = io(this.url, {
        auth: { token },
        transports: ['websocket'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.handleReconnect();
      });

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect(this.token!).catch(console.error);
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
    }
  }

  subscribeToMission(missionId: string, callback: (data: TelemetryData) => void): void {
    if (!this.socket) return;
    
    this.socket.emit('subscribe:mission', missionId);
    this.socket.on('telemetry:update', callback);
  }

  unsubscribeFromMission(missionId: string): void {
    if (!this.socket) return;
    
    this.socket.emit('unsubscribe:mission', missionId);
    this.socket.off('telemetry:update');
  }

  subscribeToDrone(droneId: string, callback: (data: DroneStatus) => void): void {
    if (!this.socket) return;
    
    this.socket.emit('subscribe:drone', droneId);
    this.socket.on('drone:status', callback);
  }

  subscribeToAlerts(callback: (alert: Alert) => void): void {
    if (!this.socket) return;
    
    this.socket.on('alert', callback);
  }

  subscribeToSite(siteId: string): void {
    if (!this.socket) return;
    
    this.socket.emit('subscribe:site', siteId);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const wsClient = new WebSocketClient(
  import.meta.env.VITE_WS_URL || 'ws://localhost:3000'
);