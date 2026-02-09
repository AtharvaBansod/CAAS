import { RedisClientType } from 'redis';
import { PresenceState } from './presence-states';
import { getLogger } from '../utils/logger';

const logger = getLogger('PresenceCache');

export interface CachedPresence {
    user_id: string;
    status: PresenceState;
    custom_status?: string;
    last_active: Date;
    cached_at: Date;
}

export class PresenceCache {
    private readonly CACHE_PREFIX = 'presence:cache:';
    private readonly CACHE_TTL = 300; // 5 minutes
    private readonly BATCH_CACHE_PREFIX = 'presence:batch:';

    constructor(private redis: RedisClientType) { }

    /**
     * Cache presence for a user
     */
    async cachePresence(userId: string, status: PresenceState, customStatus?: string, lastActive?: Date): Promise<void> {
        try {
            const key = `${this.CACHE_PREFIX}${userId}`;
            const cached: CachedPresence = {
                user_id: userId,
                status,
                custom_status: customStatus,
                last_active: lastActive || new Date(),
                cached_at: new Date(),
            };

            await this.redis.set(key, JSON.stringify(cached), {
                EX: this.CACHE_TTL,
            });

            logger.debug(`Cached presence for user ${userId}: ${status}`);
        } catch (error: any) {
            logger.error(`Failed to cache presence for ${userId}`, error);
        }
    }

    /**
     * Get cached presence for a user
     */
    async getCachedPresence(userId: string): Promise<CachedPresence | null> {
        try {
            const key = `${this.CACHE_PREFIX}${userId}`;
            const data = await this.redis.get(key);

            if (!data) {
                return null;
            }

            const cached: CachedPresence = JSON.parse(data);
            cached.last_active = new Date(cached.last_active);
            cached.cached_at = new Date(cached.cached_at);

            return cached;
        } catch (error: any) {
            logger.error(`Failed to get cached presence for ${userId}`, error);
            return null;
        }
    }

    /**
     * Batch cache multiple user presences
     */
    async batchCachePresence(presences: Map<string, { status: PresenceState; customStatus?: string }>): Promise<void> {
        try {
            const pipeline = this.redis.multi();

            for (const [userId, data] of presences.entries()) {
                const key = `${this.CACHE_PREFIX}${userId}`;
                const cached: CachedPresence = {
                    user_id: userId,
                    status: data.status,
                    custom_status: data.customStatus,
                    last_active: new Date(),
                    cached_at: new Date(),
                };

                pipeline.set(key, JSON.stringify(cached), {
                    EX: this.CACHE_TTL,
                });
            }

            await pipeline.exec();
            logger.debug(`Batch cached ${presences.size} user presences`);
        } catch (error: any) {
            logger.error(`Failed to batch cache presences`, error);
        }
    }

    /**
     * Get multiple cached presences at once
     */
    async getBatchCachedPresence(userIds: string[]): Promise<Map<string, CachedPresence>> {
        try {
            const pipeline = this.redis.multi();
            const result = new Map<string, CachedPresence>();

            for (const userId of userIds) {
                const key = `${this.CACHE_PREFIX}${userId}`;
                pipeline.get(key);
            }

            const responses = await pipeline.exec();

            if (!responses) {
                return result;
            }

            for (let i = 0; i < userIds.length; i++) {
                const data = responses[i] as string | null;
                if (data) {
                    try {
                        const cached: CachedPresence = JSON.parse(data);
                        cached.last_active = new Date(cached.last_active);
                        cached.cached_at = new Date(cached.cached_at);
                        result.set(userIds[i], cached);
                    } catch {
                        // Skip invalid entries
                    }
                }
            }

            logger.debug(`Retrieved ${result.size}/${userIds.length} cached presences`);
            return result;
        } catch (error: any) {
            logger.error(`Failed to get batch cached presences`, error);
            return new Map();
        }
    }

    /**
     * Invalidate cache for a user
     */
    async invalidateCache(userId: string): Promise<void> {
        try {
            const key = `${this.CACHE_PREFIX}${userId}`;
            await this.redis.del(key);
            logger.debug(`Invalidated presence cache for user ${userId}`);
        } catch (error: any) {
            logger.error(`Failed to invalidate cache for ${userId}`, error);
        }
    }

    /**
     * Warm cache for frequently accessed users
     */
    async warmCache(userIds: string[], fetchPresence: (userId: string) => Promise<{ status: PresenceState; customStatus?: string } | null>): Promise<void> {
        logger.info(`Warming presence cache for ${userIds.length} users`);

        const presences = new Map<string, { status: PresenceState; customStatus?: string }>();

        for (const userId of userIds) {
            const presence = await fetchPresence(userId);
            if (presence) {
                presences.set(userId, presence);
            }
        }

        await this.batchCachePresence(presences);
    }
}
