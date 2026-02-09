import { RedisClientType } from 'redis';
import { NotificationPayload } from './notification-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('NotificationPreferences');

export interface UserNotificationPreferences {
    user_id: string;
    tenant_id: string;
    push_enabled: boolean;
    in_app_enabled: boolean;
    email_enabled: boolean;
    notification_types: {
        messages: boolean;
        calls: boolean;
        mentions: boolean;
        system: boolean;
    };
    quiet_hours?: {
        enabled: boolean;
        start_hour: number; // 0-23
        end_hour: number; // 0-23
        timezone: string;
    };
    priority_filter: 'all' | 'high_only' | 'urgent_only';
}

export class NotificationPreferencesManager {
    private readonly PREFS_PREFIX = 'notification:prefs:';

    constructor(private redis: RedisClientType) { }

    /**
     * Get notification preferences for a user
     */
    async getPreferences(userId: string, tenantId: string): Promise<UserNotificationPreferences> {
        try {
            const key = `${this.PREFS_PREFIX}${userId}`;
            const data = await this.redis.get(key);

            if (!data) {
                // Return defaults
                return this.getDefaultPreferences(userId, tenantId);
            }

            return JSON.parse(data) as UserNotificationPreferences;
        } catch (error: any) {
            logger.error(`Failed to get preferences for ${userId}`, error);
            return this.getDefaultPreferences(userId, tenantId);
        }
    }

    /**
     * Update notification preferences
     */
    async updatePreferences(preferences: UserNotificationPreferences): Promise<void> {
        try {
            const key = `${this.PREFS_PREFIX}${preferences.user_id}`;
            await this.redis.set(key, JSON.stringify(preferences));

            logger.info(`Updated notification preferences for ${preferences.user_id}`);
        } catch (error: any) {
            logger.error(`Failed to update preferences`, error);
            throw error;
        }
    }

    /**
     * Check if notification should be sent based on preferences
     */
    async shouldSendNotification(
        userId: string,
        tenantId: string,
        notification: NotificationPayload
    ): Promise<{ send: boolean; channels: ('push' | 'in_app' | 'email')[] }> {
        const prefs = await this.getPreferences(userId, tenantId);

        // Check quiet hours
        if (prefs.quiet_hours?.enabled && this.isQuietHours(prefs.quiet_hours)) {
            // Only send urgent notifications during quiet hours
            if (notification.priority !== 'urgent') {
                return { send: false, channels: [] };
            }
        }

        // Check priority filter
        if (prefs.priority_filter === 'high_only' && !['high', 'urgent'].includes(notification.priority)) {
            return { send: false, channels: [] };
        }

        if (prefs.priority_filter === 'urgent_only' && notification.priority !== 'urgent') {
            return { send: false, channels: [] };
        }

        // Check notification type preferences
        const category = this.getPreferenceCategory(notification.type);
        if (category && prefs.notification_types[category] === false) {
            return { send: false, channels: [] };
        }

        // Determine channels
        const channels: ('push' | 'in_app' | 'email')[] = [];
        if (prefs.push_enabled) channels.push('push');
        if (prefs.in_app_enabled) channels.push('in_app');
        if (prefs.email_enabled) channels.push('email');

        return {
            send: channels.length > 0,
            channels,
        };
    }

    private getPreferenceCategory(type: string): keyof UserNotificationPreferences['notification_types'] | undefined {
        switch (type) {
            case 'message': return 'messages';
            case 'call_missed':
            case 'call_incoming': return 'calls';
            case 'mention': return 'mentions';
            case 'system': return 'system';
            default: return undefined;
        }
    }

    /**
     * Check if currently in quiet hours
     */
    private isQuietHours(quietHours: { start_hour: number; end_hour: number; timezone: string }): boolean {
        try {
            const now = new Date();
            const currentHour = now.getHours(); // TODO: Convert to user's timezone

            if (quietHours.start_hour < quietHours.end_hour) {
                // e.g., 22:00 - 08:00 (simple case)
                return currentHour >= quietHours.start_hour && currentHour < quietHours.end_hour;
            } else {
                // e.g., 22:00 - 08:00 (crosses midnight)
                return currentHour >= quietHours.start_hour || currentHour < quietHours.end_hour;
            }
        } catch (error: any) {
            logger.error('Failed to check quiet hours', error);
            return false;
        }
    }

    /**
     * Get default preferences
     */
    private getDefaultPreferences(userId: string, tenantId: string): UserNotificationPreferences {
        return {
            user_id: userId,
            tenant_id: tenantId,
            push_enabled: true,
            in_app_enabled: true,
            email_enabled: false,
            notification_types: {
                messages: true,
                calls: true,
                mentions: true,
                system: true,
            },
            priority_filter: 'all',
        };
    }
}
