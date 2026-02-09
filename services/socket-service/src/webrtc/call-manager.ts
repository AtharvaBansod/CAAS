import { RedisClientType } from 'redis';
import { randomUUID } from 'crypto';
import { CallStore } from './call-store';
import { Call, CallType, MediaType, CallParticipant } from './call-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('CallManager');

export class CallManager {
    private callStore: CallStore;
    private ringingTimeout: number;

    constructor(
        redis: RedisClientType,
        ringingTimeoutMs: number = 30000
    ) {
        this.callStore = new CallStore(redis);
        this.ringingTimeout = ringingTimeoutMs;
    }

    /**
     * Initiate a new call
     */
    async initiateCall(
        callerId: string,
        calleeId: string,
        mediaType: MediaType,
        tenantId: string
    ): Promise<Call> {
        logger.info(`User ${callerId} initiating ${mediaType} call to ${calleeId}`);

        // Check if caller is already in an active call
        const activeCalls = await this.callStore.getActiveCallsForUser(callerId);
        if (activeCalls.length > 0) {
            throw new Error('User is already in an active call');
        }

        // Check if callee is in an active call
        const calleeActiveCalls = await this.callStore.getActiveCallsForUser(calleeId);
        if (calleeActiveCalls.length > 0) {
            throw new Error('Callee is busy');
        }

        const callId = randomUUID();
        const call: Call = {
            id: callId,
            type: 'one_to_one',
            status: 'ringing',
            caller_id: callerId,
            participants: [
                {
                    user_id: callerId,
                    status: 'calling',
                    joined_at: new Date(),
                },
                {
                    user_id: calleeId,
                    status: 'ringing',
                },
            ],
            media_type: mediaType,
            tenant_id: tenantId,
            created_at: new Date(),
        };

        await this.callStore.saveCall(call);

        // Set timeout to auto-end call if not answered
        this.scheduleRingingTimeout(callId);

        logger.info(`Call ${callId} created`);
        return call;
    }

    /**
     * Answer a call
     */
    async answerCall(callId: string, userId: string): Promise<Call> {
        const call = await this.callStore.getCall(callId);

        if (!call) {
            throw new Error('Call not found');
        }

        if (call.status !== 'ringing') {
            throw new Error(`Call is not ringing (status: ${call.status})`);
        }

        // Update participant status
        const participant = call.participants.find(p => p.user_id === userId);
        if (!participant) {
            throw new Error('User is not a participant in this call');
        }

        participant.status = 'connected';
        participant.joined_at = new Date();

        call.status = 'answered';
        call.started_at = new Date();

        await this.callStore.saveCall(call);

        logger.info(`Call ${callId} answered by ${userId}`);
        return call;
    }

    /**
     * Reject a call
     */
    async rejectCall(callId: string, userId: string, reason?: string): Promise<void> {
        const call = await this.callStore.getCall(callId);

        if (!call) {
            throw new Error('Call not found');
        }

        if (call.status !== 'ringing') {
            throw new Error('Call is not ringing');
        }

        call.status = 'rejected';
        call.ended_at = new Date();
        call.end_reason = 'rejected';
        call.ended_by = userId;

        await this.callStore.saveCall(call);

        logger.info(`Call ${callId} rejected by ${userId}: ${reason || 'No reason'}`);
    }

    /**
     * Get call details
     */
    async getCall(callId: string): Promise<Call | null> {
        return await this.callStore.getCall(callId);
    }

    /**
     * Add participant to group call
     */
    async addParticipant(callId: string, userId: string): Promise<Call> {
        const call = await this.callStore.getCall(callId);

        if (!call) {
            throw new Error('Call not found');
        }

        if (call.type !== 'group') {
            throw new Error('Can only add participants to group calls');
        }

        // Check if user is already a participant
        const existingParticipant = call.participants.find(p => p.user_id === userId);
        if (existingParticipant) {
            throw new Error('User is already a participant');
        }

        const participant: CallParticipant = {
            user_id: userId,
            status: 'ringing',
        };

        call.participants.push(participant);
        await this.callStore.saveCall(call);

        logger.info(`Added user ${userId} to call ${callId}`);
        return call;
    }

    /**
     * Schedule ringing timeout
     */
    private scheduleRingingTimeout(callId: string): void {
        setTimeout(async () => {
            const call = await this.callStore.getCall(callId);

            if (call && call.status === 'ringing') {
                logger.warn(`Call ${callId} timed out - no answer`);

                call.status = 'missed';
                call.ended_at = new Date();
                call.end_reason = 'timeout';

                await this.callStore.saveCall(call);
            }
        }, this.ringingTimeout);
    }
}
