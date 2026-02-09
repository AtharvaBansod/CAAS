import { Server } from 'socket.io';
import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('SignalingRelay');

export class SignalingRelay {
    constructor(
        private io: Server,
        private redis: RedisClientType
    ) { }

    /**
     * Relay signaling message to a specific user
     */
    async relayToUser(
        targetUserId: string,
        event: string,
        data: unknown
    ): Promise<void> {
        try {
            // Get all socket IDs for target user
            const socketIds = await this.getSocketsForUser(targetUserId);

            if (socketIds.length === 0) {
                logger.warn(`Cannot relay ${event} to offline user ${targetUserId}`);
                return;
            }

            // Send to all sockets of the target user
            for (const socketId of socketIds) {
                this.io.to(socketId).emit(event, data);
            }

            logger.debug(`Relayed ${event} to user ${targetUserId} (${socketIds.length} sockets)`);
        } catch (error: any) {
            logger.error(`Failed to relay to user ${targetUserId}`, error);
            throw error;
        }
    }

    /**
     * Relay message to all participants in a call
     */
    async relayToCallParticipants(
        callId: string,
        event: string,
        data: unknown,
        excludeUserId?: string
    ): Promise<void> {
        try {
            const roomName = `call:${callId}`;

            if (excludeUserId) {
                // Get sockets for excluded user
                const excludedSockets = await this.getSocketsForUser(excludeUserId);

                // Emit to room except excluded sockets
                const room = this.io.to(roomName);
                for (const socketId of excludedSockets) {
                    room.except(socketId);
                }
                room.emit(event, data);
            } else {
                // Emit to all in room
                this.io.to(roomName).emit(event, data);
            }

            logger.debug(`Relayed ${event} to call ${callId}`);
        } catch (error: any) {
            logger.error(`Failed to relay to call ${callId}`, error);
            throw error;
        }
    }

    /**
     * Get all socket IDs for a user (may be connected from multiple devices)
     */
    private async getSocketsForUser(userId: string): Promise<string[]> {
        try {
            const key = `socket:user:${userId}`;
            const socketIds = await this.redis.sMembers(key);
            return socketIds;
        } catch (error: any) {
            logger.error(`Failed to get sockets for user ${userId}`, error);
            return [];
        }
    }
}
