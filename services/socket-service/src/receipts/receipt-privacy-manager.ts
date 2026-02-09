import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('ReceiptPrivacyManager');

export interface ReceiptPrivacySettings {
    user_id: string;
    tenant_id: string;
    read_receipts_enabled: boolean;
    delivery_receipts_enabled: boolean;
    typing_indicators_enabled: boolean;
}

export class ReceiptPrivacyManager {
    private readonly SETTINGS_PREFIX = 'privacy:receipts:';

    constructor(private redis: RedisClientType) { }

    /**
     * Get privacy settings for a user
     */
    async getSettings(userId: string, tenantId: string): Promise<ReceiptPrivacySettings> {
        try {
            const key = `${this.SETTINGS_PREFIX}${userId}`;
            const data = await this.redis.hGetAll(key);

            return {
                user_id: userId,
                tenant_id: tenantId,
                read_receipts_enabled: data.read_receipts_enabled !== 'false',
                delivery_receipts_enabled: data.delivery_receipts_enabled !== 'false',
                typing_indicators_enabled: data.typing_indicators_enabled !== 'false',
            };
        } catch (error: any) {
            logger.error(`Failed to get privacy settings for ${userId}`, error);
            // Default to all enabled
            return {
                user_id: userId,
                tenant_id: tenantId,
                read_receipts_enabled: true,
                delivery_receipts_enabled: true,
                typing_indicators_enabled: true,
            };
        }
    }

    /**
     * Update privacy settings
     */
    async updateSettings(settings: ReceiptPrivacySettings): Promise<void> {
        try {
            const key = `${this.SETTINGS_PREFIX}${settings.user_id}`;
            await this.redis.hSet(key, {
                read_receipts_enabled: settings.read_receipts_enabled.toString(),
                delivery_receipts_enabled: settings.delivery_receipts_enabled.toString(),
                typing_indicators_enabled: settings.typing_indicators_enabled.toString(),
            });

            logger.info(`Updated privacy settings for ${settings.user_id}`);
        } catch (error: any) {
            logger.error(`Failed to update privacy settings for ${settings.user_id}`, error);
            throw error;
        }
    }

    /**
     * Check if user has read receipts enabled
     */
    async canSendReadReceipt(userId: string, tenantId: string): Promise<boolean> {
        const settings = await this.getSettings(userId, tenantId);
        return settings.read_receipts_enabled;
    }

    /**
     * Check if user has delivery receipts enabled
     */
    async canSendDeliveryReceipt(userId: string, tenantId: string): Promise<boolean> {
        const settings = await this.getSettings(userId, tenantId);
        return settings.delivery_receipts_enabled;
    }

    /**
     * Check if user has typing indicators enabled
     */
    async canSendTypingIndicator(userId: string, tenantId: string): Promise<boolean> {
        const settings = await this.getSettings(userId, tenantId);
        return settings.typing_indicators_enabled;
    }
}
