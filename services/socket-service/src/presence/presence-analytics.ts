import { RedisClientType } from 'redis';
import { PresenceState } from './presence-states';
import { getLogger } from '../utils/logger';

const logger = getLogger('PresenceAnalytics');

export interface PresenceMetrics {
    total_users: number;
    online_users: number;
    away_users: number;
    busy_users: number;
    offline_users: number;
    online_percentage: number;
    peak_online_count: number;
    peak_online_time?: Date;
    average_session_duration_minutes?: number;
}

export interface UserActivityMetrics {
    user_id: string;
    total_sessions: number;
    total_online_time_minutes: number;
    average_session_duration_minutes: number;
    last_online: Date;
    most_common_status: PresenceState;
}

export class PresenceAnalytics {
    private readonly METRICS_PREFIX = 'analytics:presence:';
    private readonly USER_ACTIVITY_PREFIX = 'analytics:user:activity:';

    constructor(private redis: RedisClientType) { }

    /**
     * Record presence change for analytics
     */
    async recordPresenceChange(userId: string, newStatus: PresenceState, previousStatus?: PresenceState): Promise<void> {
        try {
            const timestamp = Date.now();
            const dateKey = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const metricsKey = `${this.METRICS_PREFIX}${dateKey}`;

            // Track status counts
            await this.redis.hIncrBy(metricsKey, `status:${newStatus}`, 1);

            if (previousStatus) {
                await this.redis.hIncrBy(metricsKey, `status:${previousStatus}`, -1);
            }

            // Track total users
            await this.redis.sAdd(`${this.METRICS_PREFIX}users:${dateKey}`, userId);

            // Set expiration (30 days)
            await this.redis.expire(metricsKey, 30 * 24 * 60 * 60);

            // If going online, record session start
            if (newStatus === 'online' && previousStatus !== 'online') {
                await this.recordSessionStart(userId, timestamp);
            }

            // If going offline, record session end
            if (newStatus === 'offline' && previousStatus && previousStatus !== 'offline') {
                await this.recordSessionEnd(userId, timestamp);
            }

            logger.debug(`Recorded presence change for ${userId}: ${previousStatus} -> ${newStatus}`);
        } catch (error: any) {
            logger.error(`Failed to record presence change`, error);
        }
    }

    /**
     * Record session start
     */
    private async recordSessionStart(userId: string, timestamp: number): Promise<void> {
        const key = `${this.USER_ACTIVITY_PREFIX}${userId}:current_session`;
        await this.redis.set(key, timestamp.toString(), { EX: 24 * 60 * 60 });
    }

    /**
     * Record session end
     */
    private async recordSessionEnd(userId: string, timestamp: number): Promise<void> {
        const key = `${this.USER_ACTIVITY_PREFIX}${userId}:current_session`;
        const startTime = await this.redis.get(key);

        if (startTime) {
            const durationMs = timestamp - parseInt(startTime, 10);
            const durationMinutes = Math.round(durationMs / 60000);

            // Update user activity metrics
            const metricsKey = `${this.USER_ACTIVITY_PREFIX}${userId}`;
            await this.redis.hIncrBy(metricsKey, 'total_sessions', 1);
            await this.redis.hIncrBy(metricsKey, 'total_online_time_minutes', durationMinutes);
            await this.redis.hSet(metricsKey, 'last_online', timestamp.toString());

            // Delete current session
            await this.redis.del(key);

            logger.debug(`Recorded session end for ${userId}: ${durationMinutes} minutes`);
        }
    }

    /**
     * Get current presence metrics
     */
    async getCurrentMetrics(): Promise<PresenceMetrics> {
        try {
            const dateKey = new Date().toISOString().split('T')[0];
            const metricsKey = `${this.METRICS_PREFIX}${dateKey}`;
            const data = await this.redis.hGetAll(metricsKey);

            const onlineUsers = parseInt(data['status:online'] || '0', 10);
            const awayUsers = parseInt(data['status:away'] || '0', 10);
            const busyUsers = parseInt(data['status:busy'] || '0', 10);
            const offlineUsers = parseInt(data['status:offline'] || '0', 10);

            const totalUsers = onlineUsers + awayUsers + busyUsers + offlineUsers;
            const onlinePercentage = totalUsers > 0 ? Math.round((onlineUsers / totalUsers) * 100) : 0;

            // Get peak online count
            const peakCount = parseInt(data['peak_online_count'] || '0', 10);
            const peakTime = data['peak_online_time'] ? new Date(parseInt(data['peak_online_time'], 10)) : undefined;

            // Update peak if current is higher
            if (onlineUsers > peakCount) {
                await this.redis.hSet(metricsKey, 'peak_online_count', onlineUsers.toString());
                await this.redis.hSet(metricsKey, 'peak_online_time', Date.now().toString());
            }

            return {
                total_users: totalUsers,
                online_users: onlineUsers,
                away_users: awayUsers,
                busy_users: busyUsers,
                offline_users: offlineUsers,
                online_percentage: onlinePercentage,
                peak_online_count: Math.max(peakCount, onlineUsers),
                peak_online_time: peakTime,
            };
        } catch (error: any) {
            logger.error('Failed to get current metrics', error);
            return {
                total_users: 0,
                online_users: 0,
                away_users: 0,
                busy_users: 0,
                offline_users: 0,
                online_percentage: 0,
                peak_online_count: 0,
            };
        }
    }

    /**
     * Get user activity metrics
     */
    async getUserActivityMetrics(userId: string): Promise<UserActivityMetrics | null> {
        try {
            const metricsKey = `${this.USER_ACTIVITY_PREFIX}${userId}`;
            const data = await this.redis.hGetAll(metricsKey);

            if (Object.keys(data).length === 0) {
                return null;
            }

            const totalSessions = parseInt(data.total_sessions || '0', 10);
            const totalOnlineTime = parseInt(data.total_online_time_minutes || '0', 10);
            const averageSessionDuration = totalSessions > 0 ? Math.round(totalOnlineTime / totalSessions) : 0;

            return {
                user_id: userId,
                total_sessions: totalSessions,
                total_online_time_minutes: totalOnlineTime,
                average_session_duration_minutes: averageSessionDuration,
                last_online: new Date(parseInt(data.last_online || '0', 10)),
                most_common_status: (data.most_common_status as PresenceState) || 'offline',
            };
        } catch (error: any) {
            logger.error(`Failed to get user activity metrics for ${userId}`, error);
            return null;
        }
    }

    /**
     * Get historical metrics for a date range
     */
    async getHistoricalMetrics(startDate: Date, endDate: Date): Promise<Map<string, PresenceMetrics>> {
        const metrics = new Map<string, PresenceMetrics>();
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateKey = currentDate.toISOString().split('T')[0];
            const metricsKey = `${this.METRICS_PREFIX}${dateKey}`;

            try {
                const data = await this.redis.hGetAll(metricsKey);

                if (Object.keys(data).length > 0) {
                    const onlineUsers = parseInt(data['status:online'] || '0', 10);
                    const awayUsers = parseInt(data['status:away'] || '0', 10);
                    const busyUsers = parseInt(data['status:busy'] || '0', 10);
                    const offlineUsers = parseInt(data['status:offline'] || '0', 10);
                    const totalUsers = onlineUsers + awayUsers + busyUsers + offlineUsers;

                    metrics.set(dateKey, {
                        total_users: totalUsers,
                        online_users: onlineUsers,
                        away_users: awayUsers,
                        busy_users: busyUsers,
                        offline_users: offlineUsers,
                        online_percentage: totalUsers > 0 ? Math.round((onlineUsers / totalUsers) * 100) : 0,
                        peak_online_count: parseInt(data['peak_online_count'] || '0', 10),
                        peak_online_time: data['peak_online_time'] ? new Date(parseInt(data['peak_online_time'], 10)) : undefined,
                    });
                }
            } catch (error: any) {
                logger.error(`Failed to get metrics for ${dateKey}`, error);
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return metrics;
    }
}
