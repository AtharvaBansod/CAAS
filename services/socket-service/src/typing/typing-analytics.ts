import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('TypingAnalytics');

export interface TypingMetrics {
    total_typing_events: number;
    active_typers: number;
    average_typing_duration_ms: number;
}

export class TypingAnalytics {
    private readonly METRICS_KEY = 'analytics:typing';

    constructor(private redis: RedisClientType) { }

    /**
     * Record typing event for analytics
     */
    async recordTypingEvent(userId: string, conversationId: string, durationMs?: number): Promise<void> {
        try {
            const key = `${this.METRICS_KEY}:${conversationId}`;
            await this.redis.hIncrBy(key, 'total_events', 1);

            if (durationMs) {
                await this.redis.hIncrBy(key, 'total_duration_ms', durationMs);
            }

            logger.debug(`Recorded typing event for ${userId} in ${conversationId}`);
        } catch (error: any) {
            logger.error('Failed to record typing event', error);
        }
    }

    /**
     * Get typing metrics for a conversation
     */
    async getMetrics(conversationId: string): Promise<TypingMetrics> {
        try {
            const key = `${this.METRICS_KEY}:${conversationId}`;
            const data = await this.redis.hGetAll(key);

            const totalEvents = parseInt(data.total_events || '0', 10);
            const totalDuration = parseInt(data.total_duration_ms || '0', 10);
            const averageDuration = totalEvents > 0 ? totalDuration / totalEvents : 0;

            return {
                total_typing_events: totalEvents,
                active_typers: 0, // Would need to track active in real-time
                average_typing_duration_ms: averageDuration,
            };
        } catch (error: any) {
            logger.error(`Failed to get typing metrics for ${conversationId}`, error);
            return {
                total_typing_events: 0,
                active_typers: 0,
                average_typing_duration_ms: 0,
            };
        }
    }
}
