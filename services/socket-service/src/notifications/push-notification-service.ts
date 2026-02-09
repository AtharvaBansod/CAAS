import { getLogger } from '../utils/logger';
import { NotificationPayload } from './notification-types';

const logger = getLogger('PushNotificationService');

export interface DeviceToken {
    user_id: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    registered_at: Date;
}

export interface PushNotificationResult {
    success: boolean;
    message_id?: string;
    error?: string;
}

/**
 * Push notification service supporting FCM (Firebase Cloud Messaging) and APNS (Apple Push Notification Service)
 * Note: This is a template implementation. Actual FCM/APNS integration requires credentials.
 */
export class PushNotificationService {
    private fcmServerKey?: string;
    private apnsConfig?: {
        keyId: string;
        teamId: string;
        keyPath: string;
    };

    constructor() {
        // Load configuration from environment
        this.fcmServerKey = process.env.FCM_SERVER_KEY;

        if (process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID && process.env.APNS_KEY_PATH) {
            this.apnsConfig = {
                keyId: process.env.APNS_KEY_ID,
                teamId: process.env.APNS_TEAM_ID,
                keyPath: process.env.APNS_KEY_PATH,
            };
        }
    }

    /**
     * Send push notification to a device
     */
    async sendToDevice(
        deviceToken: DeviceToken,
        notification: NotificationPayload
    ): Promise<PushNotificationResult> {
        try {
            if (deviceToken.platform === 'android' || deviceToken.platform === 'web') {
                return await this.sendViaFCM(deviceToken.token, notification);
            } else if (deviceToken.platform === 'ios') {
                return await this.sendViaAPNS(deviceToken.token, notification);
            }

            return {
                success: false,
                error: 'Unsupported platform',
            };
        } catch (error: any) {
            logger.error(`Failed to send push notification to device`, error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Send via Firebase Cloud Messaging (FCM)
     */
    private async sendViaFCM(
        token: string,
        notification: NotificationPayload
    ): Promise<PushNotificationResult> {
        if (!this.fcmServerKey) {
            logger.warn('FCM server key not configured');
            return {
                success: false,
                error: 'FCM not configured',
            };
        }

        try {
            // FCM API v1 endpoint
            const fcmUrl = 'https://fcm.googleapis.com/fcm/send';

            const payload = {
                to: token,
                priority: notification.priority === 'urgent' ? 'high' : 'normal',
                notification: {
                    title: notification.title,
                    body: notification.body,
                    sound: 'default',
                },
                data: notification.data || {},
            };

            const response = await fetch(fcmUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${this.fcmServerKey}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const error = await response.text();
                logger.error(`FCM request failed: ${error}`);
                return {
                    success: false,
                    error: `FCM error: ${response.status}`,
                };
            }

            const result = await response.json();

            logger.info(`FCM notification sent successfully`);
            return {
                success: true,
                message_id: result.message_id,
            };
        } catch (error: any) {
            logger.error('FCM send failed', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Send via Apple Push Notification Service (APNS)
     */
    private async sendViaAPNS(
        token: string,
        notification: NotificationPayload
    ): Promise<PushNotificationResult> {
        if (!this.apnsConfig) {
            logger.warn('APNS not configured');
            return {
                success: false,
                error: 'APNS not configured',
            };
        }

        try {
            // Note: This is a template. Real APNS requires HTTP/2 and JWT authentication
            // In production, use a library like 'apn' or 'node-apn'

            logger.info('APNS notification would be sent here (template implementation)');

            // Template implementation - would need actual APNS library
            return {
                success: true,
                message_id: `apns-${Date.now()}`,
            };
        } catch (error: any) {
            logger.error('APNS send failed', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Send to multiple devices (batch)
     */
    async sendToDevices(
        devices: DeviceToken[],
        notification: NotificationPayload
    ): Promise<PushNotificationResult[]> {
        const results: PushNotificationResult[] = [];

        for (const device of devices) {
            const result = await this.sendToDevice(device, notification);
            results.push(result);
        }

        const successCount = results.filter(r => r.success).length;
        logger.info(`Sent ${successCount}/${devices.length} push notifications successfully`);

        return results;
    }

    /**
     * Check if push notifications are configured
     */
    isConfigured(): { fcm: boolean; apns: boolean } {
        return {
            fcm: !!this.fcmServerKey,
            apns: !!this.apnsConfig,
        };
    }
}
