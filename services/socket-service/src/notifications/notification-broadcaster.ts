import { Server } from 'socket.io';
import { NotificationPayload } from './notification-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('NotificationBroadcaster');

export class NotificationBroadcaster {
    constructor(private io: Server) { }

    /**
     * Broadcast in-app notification to user
     */
    async broadcastToUser(userId: string, notification: NotificationPayload): Promise<void> {
        try {
            // Send to all sockets of the user via Socket.IO
            this.io.emit(`notification:${userId}`, notification);

            logger.debug(`Broadcast notification ${notification.id} to user ${userId}`);
        } catch (error: any) {
            logger.error(`Failed to broadcast notification to user ${userId}`, error);
        }
    }

    /**
     * Broadcast notification to multiple users
     */
    async broadcastToUsers(userIds: string[], notification: NotificationPayload): Promise<void> {
        for (const userId of userIds) {
            await this.broadcastToUser(userId, notification);
        }
    }
}
