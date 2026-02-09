import { Server } from 'socket.io';
import { RedisClientType } from 'redis';
import { CallStore } from './call-store';
import { CallRecord } from './call-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('CallHistorySaver');

/**
 * Interface for MongoDB collections (using minimal adapter pattern)
 */
interface CallHistoryCollection {
    insertOne(doc: CallRecord): Promise<void>;
}

export class CallHistorySaver {
    private callStore: CallStore;

    constructor(
        private redis: RedisClientType,
        private callHistoryCollection?: CallHistoryCollection
    ) {
        this.callStore = new CallStore(redis);
    }

    /**
     * Save call history to MongoDB
     */
    async saveCallHistory(callId: string): Promise<void> {
        try {
            const call = await this.callStore.getCall(callId);

            if (!call) {
                logger.warn(`Cannot save history: Call ${callId} not found`);
                return;
            }

            // Calculate duration
            let durationSeconds: number | undefined;
            if (call.started_at && call.ended_at) {
                durationSeconds = Math.floor(
                    (call.ended_at.getTime() - call.started_at.getTime()) / 1000
                );
            }

            const callRecord: CallRecord = {
                call_id: call.id,
                type: call.type,
                participants: call.participants.map(p => ({
                    user_id: p.user_id,
                    joined_at: p.joined_at,
                    left_at: p.left_at,
                })),
                caller_id: call.caller_id,
                media_type: call.media_type,
                tenant_id: call.tenant_id,
                created_at: call.created_at,
                started_at: call.started_at,
                ended_at: call.ended_at,
                duration_seconds: durationSeconds,
                end_reason: call.end_reason || 'user_hangup',
                ended_by: call.ended_by,
            };

            // Save to MongoDB if collection is available
            if (this.callHistoryCollection) {
                await this.callHistoryCollection.insertOne(callRecord);
                logger.info(`Saved call ${callId} to history (duration: ${durationSeconds}s)`);
            } else {
                logger.warn(`No MongoDB collection available for call history`);
            }

            // Remove from active calls
            await this.callStore.deleteCall(callId);
        } catch (error: any) {
            logger.error(`Failed to save call history for ${callId}`, error);
            throw error;
        }
    }
}
