import { Server } from 'socket.io';
import { PresenceSubscriber } from './presence-subscriber';
import { PresenceStatus, UserPresence } from './presence-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('PresenceNotifier');

export interface PresenceEvent {
  user_id: string;
  status: PresenceStatus;
  custom_status?: string;
  last_seen?: Date;
  timestamp: Date;
}

export class PresenceNotifier {
  private io: Server;
  private subscriber: PresenceSubscriber;

  constructor(io: Server, subscriber: PresenceSubscriber) {
    this.io = io;
    this.subscriber = subscriber;
  }

  /**
   * Notify subscribers when a user's status changes
   */
  async notifyStatusChange(userId: string, newStatus: PresenceStatus, customStatus?: string): Promise<void> {
    try {
      // Get all subscribers for this user
      const subscribers = await this.subscriber.getSubscribers(userId);

      if (subscribers.length === 0) {
        return;
      }

      const event: PresenceEvent = {
        user_id: userId,
        status: newStatus,
        custom_status: customStatus,
        timestamp: new Date(),
      };

      // Send to each subscriber's sockets
      for (const subscriberId of subscribers) {
        await this.sendToUser(subscriberId, 'presence_update', event);
      }

      logger.info(`Notified ${subscribers.length} subscribers of ${userId}'s status change to ${newStatus}`);
    } catch (error: any) {
      logger.error('Error notifying status change', error);
    }
  }

  /**
   * Notify subscribers of a presence event
   */
  async notifySubscribers(userId: string, event: PresenceEvent): Promise<void> {
    try {
      const subscribers = await this.subscriber.getSubscribers(userId);

      if (subscribers.length === 0) {
        return;
      }

      // Send to each subscriber's sockets
      for (const subscriberId of subscribers) {
        await this.sendToUser(subscriberId, 'presence_event', event);
      }

      logger.debug(`Sent presence event to ${subscribers.length} subscribers`);
    } catch (error: any) {
      logger.error('Error notifying subscribers', error);
    }
  }

  /**
   * Notify about last seen update
   */
  async notifyLastSeenUpdate(userId: string, lastSeen: Date): Promise<void> {
    try {
      const subscribers = await this.subscriber.getSubscribers(userId);

      if (subscribers.length === 0) {
        return;
      }

      const event = {
        user_id: userId,
        last_seen: lastSeen,
        timestamp: new Date(),
      };

      for (const subscriberId of subscribers) {
        await this.sendToUser(subscriberId, 'last_seen_update', event);
      }

      logger.debug(`Notified ${subscribers.length} subscribers of ${userId}'s last seen`);
    } catch (error: any) {
      logger.error('Error notifying last seen update', error);
    }
  }

  /**
   * Send event to all sockets of a user
   */
  private async sendToUser(userId: string, event: string, data: unknown): Promise<void> {
    try {
      // Send to user's personal room
      this.io.to(`user:${userId}`).emit(event, data);
    } catch (error: any) {
      logger.error(`Error sending to user ${userId}:`, error);
    }
  }

  /**
   * Broadcast presence to a room
   */
  async broadcastToRoom(roomId: string, event: PresenceEvent): Promise<void> {
    try {
      this.io.to(roomId).emit('presence_update', event);
    } catch (error: any) {
      logger.error(`Error broadcasting to room ${roomId}:`, error);
    }
  }
}
