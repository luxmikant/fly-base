/**
 * WebSocket Service
 * Enhanced WebSocket service for real-time analytics
 */

import { Server } from 'socket.io';
import { logger } from '../lib/logger';

export class WebSocketService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(event: string, data: any): void {
    try {
      this.io.emit(event, data);
      logger.debug('Broadcasted message', { event, dataKeys: Object.keys(data) });
    } catch (error) {
      logger.error('Error broadcasting message', { error, event });
    }
  }

  /**
   * Broadcast to specific organization
   */
  broadcastToOrg(orgId: string, event: string, data: any): void {
    try {
      this.io.to(`org:${orgId}`).emit(event, data);
      logger.debug('Broadcasted to organization', { orgId, event });
    } catch (error) {
      logger.error('Error broadcasting to organization', { error, orgId, event });
    }
  }

  /**
   * Broadcast to specific mission subscribers
   */
  broadcastToMission(missionId: string, event: string, data: any): void {
    try {
      this.io.to(`mission:${missionId}`).emit(event, data);
      logger.debug('Broadcasted to mission', { missionId, event });
    } catch (error) {
      logger.error('Error broadcasting to mission', { error, missionId, event });
    }
  }

  /**
   * Broadcast to specific drone subscribers
   */
  broadcastToDrone(droneId: string, event: string, data: any): void {
    try {
      this.io.to(`drone:${droneId}`).emit(event, data);
      logger.debug('Broadcasted to drone', { droneId, event });
    } catch (error) {
      logger.error('Error broadcasting to drone', { error, droneId, event });
    }
  }

  /**
   * Broadcast to specific site subscribers
   */
  broadcastToSite(siteId: string, event: string, data: any): void {
    try {
      this.io.to(`site:${siteId}`).emit(event, data);
      logger.debug('Broadcasted to site', { siteId, event });
    } catch (error) {
      logger.error('Error broadcasting to site', { error, siteId, event });
    }
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get clients in specific room
   */
  getClientsInRoom(room: string): number {
    const roomClients = this.io.sockets.adapter.rooms.get(room);
    return roomClients ? roomClients.size : 0;
  }
}

export default WebSocketService;