import { RedisClientType } from 'redis';
import { PresenceState } from './presence-states';
import { getLogger } from '../utils/logger';

const logger = getLogger('PresenceSyncManager');

export interface PresenceSyncEvent {
    user_id: string;
    tenant_id: string;
    status: PresenceState;
    custom_status?: string;
    last_active: Date;
    node_id: string; // Which socket server node
}

export class PresenceSyncManager {
    private readonly SYNC_CHANNEL = 'presence:sync';
    private nodeId: string;

    constructor(
        private redis: RedisClientType,
        nodeId?: string
    ) {
        this.nodeId = nodeId || `node-${process.pid}`;
    }

    /**
     * Broadcast presence change to other nodes
     */
    async broadcastPresenceChange(event: PresenceSyncEvent): Promise<void> {
        try {
            await this.redis.publish(
                this.SYNC_CHANNEL,
                JSON.stringify({ ...event, node_id: this.nodeId })
            );

            logger.debug(`Broadcast presence change: ${event.user_id} -> ${event.status}`);
        } catch (error: any) {
            logger.error('Failed to broadcast presence change', error);
        }
    }

    /**
     * Subscribe to presence sync events from other nodes
     */
    async subscribeTo(callback: (event: PresenceSyncEvent) => void): Promise<void> {
        try {
            const subscriber = this.redis.duplicate();
            await subscriber.connect();

            await subscriber.subscribe(this.SYNC_CHANNEL, (message) => {
                try {
                    const event: PresenceSyncEvent = JSON.parse(message);

                    // Ignore events from this node
                    if (event.node_id === this.nodeId) {
                        return;
                    }

                    callback(event);
                } catch (error: any) {
                    logger.error('Failed to parse presence sync event', error);
                }
            });

            logger.info('Subscribed to presence sync channel');
        } catch (error: any) {
            logger.error('Failed to subscribe to presence sync', error);
        }
    }
}
