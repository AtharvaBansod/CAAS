import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { NotificationPayload } from './notification-types';
import { NotificationBroadcaster } from './notification-broadcaster';
import { PushNotificationService, DeviceToken } from './push-notification-service';
import { NotificationPreferencesManager } from './notification-preferences';
import { Server } from 'socket.io';
import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('NotificationConsumer');

export interface NotificationMessage {
    type: 'notification';
    payload: NotificationPayload;
    device_tokens?: DeviceToken[];
}

export class NotificationConsumer {
    private consumer: Consumer;
    private broadcaster: NotificationBroadcaster;
    private pushService: PushNotificationService;
    private preferencesManager: NotificationPreferencesManager;

    constructor(
        private kafka: Kafka,
        io: Server,
        redis: RedisClientType
    ) {
        this.consumer = this.kafka.consumer({ groupId: 'notification-service' });
        this.broadcaster = new NotificationBroadcaster(io);
        this.pushService = new PushNotificationService();
        this.preferencesManager = new NotificationPreferencesManager(redis);
    }

    /**
     * Start consuming notification messages from Kafka
     */
    async start(): Promise<void> {
        try {
            await this.consumer.connect();
            logger.info('Connected to Kafka');

            // Subscribe to notification topics
            await this.consumer.subscribe({
                topics: ['notifications', 'notifications.priority'],
                fromBeginning: false,
            });

            logger.info('Subscribed to notification topics');

            await this.consumer.run({
                eachMessage: async (payload: EachMessagePayload) => {
                    await this.handleMessage(payload);
                },
            });

            logger.info('Notification consumer started');
        } catch (error: any) {
            logger.error('Failed to start notification consumer', error);
            throw error;
        }
    }

    /**
     * Stop the consumer
     */
    async stop(): Promise<void> {
        try {
            await this.consumer.disconnect();
            logger.info('Notification consumer stopped');
        } catch (error: any) {
            logger.error('Error stopping consumer', error);
        }
    }

    /**
     * Handle incoming Kafka message
     */
    private async handleMessage(payload: EachMessagePayload): Promise<void> {
        try {
            const { topic, partition, message } = payload;

            if (!message.value) {
                logger.warn('Received empty message');
                return;
            }

            const notificationMessage: NotificationMessage = JSON.parse(message.value.toString());

            if (notificationMessage.type !== 'notification') {
                logger.warn(`Unknown message type: ${notificationMessage.type}`);
                return;
            }

            const notification = notificationMessage.payload;

            logger.info(`Processing notification ${notification.id} for user ${notification.user_id}`);

            // Check user preferences
            const { send, channels } = await this.preferencesManager.shouldSendNotification(
                notification.user_id,
                notification.tenant_id,
                notification
            );

            if (!send) {
                logger.info(`Notification ${notification.id} filtered by user preferences`);
                return;
            }

            // Send via appropriate channels
            const promises: Promise<any>[] = [];

            if (channels.includes('in_app')) {
                promises.push(this.broadcaster.broadcastToUser(notification.user_id, notification));
            }

            if (channels.includes('push') && notificationMessage.device_tokens) {
                promises.push(
                    this.pushService.sendToDevices(notificationMessage.device_tokens, notification)
                );
            }

            // Email would be handled here if implemented
            // if (channels.includes('email')) { ... }

            await Promise.all(promises);

            logger.info(`Notification ${notification.id} sent via ${channels.join(', ')}`);
        } catch (error: any) {
            logger.error('Error handling notification message', error);
            // Don't throw - allow consumer to continue
        }
    }

    /**
     * Health check
     */
    isConnected(): boolean {
        // kafkajs doesn't expose connection status directly
        // This is a simplified check
        return true;
    }
}
