import { RedisClientType } from 'redis';
import { Call, CallStatus } from './call-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('CallStore');

export class CallStore {
    private readonly CALL_PREFIX = 'call:';
    private readonly CALL_TTL = 24 * 60 * 60; // 24 hours

    constructor(private redis: RedisClientType) { }

    /**
     * Save call to Redis
     */
    async saveCall(call: Call): Promise<void> {
        try {
            const key = `${this.CALL_PREFIX}${call.id}`;
            await this.redis.set(key, JSON.stringify(call), {
                EX: this.CALL_TTL,
            });
            logger.debug(`Saved call ${call.id} to Redis`);
        } catch (error: any) {
            logger.error(`Failed to save call ${call.id}`, error);
            throw error;
        }
    }

    /**
     * Get call from Redis
     */
    async getCall(callId: string): Promise<Call | null> {
        try {
            const key = `${this.CALL_PREFIX}${callId}`;
            const data = await this.redis.get(key);

            if (!data) {
                return null;
            }

            const call = JSON.parse(data) as Call;
            // Convert date strings back to Date objects
            call.created_at = new Date(call.created_at);
            if (call.started_at) call.started_at = new Date(call.started_at);
            if (call.ended_at) call.ended_at = new Date(call.ended_at);

            return call;
        } catch (error: any) {
            logger.error(`Failed to get call ${callId}`, error);
            return null;
        }
    }

    /**
     * Update call status
     */
    async updateCallStatus(callId: string, status: CallStatus): Promise<void> {
        const call = await this.getCall(callId);
        if (!call) {
            throw new Error(`Call ${callId} not found`);
        }

        call.status = status;

        if (status === 'connected' && !call.started_at) {
            call.started_at = new Date();
        }

        if (status === 'ended' && !call.ended_at) {
            call.ended_at = new Date();
        }

        await this.saveCall(call);
    }

    /**
     * Delete call from Redis
     */
    async deleteCall(callId: string): Promise<void> {
        try {
            const key = `${this.CALL_PREFIX}${callId}`;
            await this.redis.del(key);
            logger.debug(`Deleted call ${callId} from Redis`);
        } catch (error: any) {
            logger.error(`Failed to delete call ${callId}`, error);
        }
    }

    /**
     * Get active calls for a user
     */
    async getActiveCallsForUser(userId: string): Promise<Call[]> {
        try {
            const pattern = `${this.CALL_PREFIX}*`;
            const keys = await this.redis.keys(pattern);

            const activeCalls: Call[] = [];

            for (const key of keys) {
                const data = await this.redis.get(key);
                if (data) {
                    const call = JSON.parse(data) as Call;

                    // Check if user is a participant and call is active
                    if (call.status !== 'ended' && call.status !== 'rejected') {
                        const isParticipant = call.participants.some(p => p.user_id === userId) || call.caller_id === userId;
                        if (isParticipant) {
                            activeCalls.push(call);
                        }
                    }
                }
            }

            return activeCalls;
        } catch (error: any) {
            logger.error(`Failed to get active calls for user ${userId}`, error);
            return [];
        }
    }
}
