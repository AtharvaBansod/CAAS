import { RedisClientType } from 'redis';
import { CallManager } from './call-manager';
import { CallStore } from './call-store';
import { Call, CallParticipant, MediaType } from './call-types';
import { randomUUID } from 'crypto';
import { getLogger } from '../utils/logger';

const logger = getLogger('GroupCallManager');

export class GroupCallManager {
    private callStore: CallStore;

    constructor(
        private redis: RedisClientType,
        private callManager: CallManager
    ) {
        this.callStore = new CallStore(redis);
    }

    /**
     * Create a new group call
     */
    async createGroupCall(
        creatorId: string,
        participantIds: string[],
        mediaType: MediaType,
        tenantId: string
    ): Promise<Call> {
        logger.info(`User ${creatorId} creating group call with ${participantIds.length} participants`);

        const callId = randomUUID();

        // Create participants list
        const participants: CallParticipant[] = [
            {
                user_id: creatorId,
                status: 'calling',
                joined_at: new Date(),
            },
            ...participantIds.map(userId => ({
                user_id: userId,
                status: 'ringing' as const,
            })),
        ];

        const call: Call = {
            id: callId,
            type: 'group',
            status: 'ringing',
            caller_id: creatorId,
            participants,
            media_type: mediaType,
            tenant_id: tenantId,
            created_at: new Date(),
        };

        await this.callStore.saveCall(call);

        logger.info(`Group call ${callId} created with ${participants.length} participants`);
        return call;
    }

    /**
     * Add participant to existing group call
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
            // If already exists but disconnected, re-join
            if (existingParticipant.status === 'disconnected') {
                existingParticipant.status = 'calling';
                existingParticipant.left_at = undefined;
            } else {
                throw new Error('User is already a participant');
            }
        } else {
            // Add new participant
            const participant: CallParticipant = {
                user_id: userId,
                status: 'ringing',
            };
            call.participants.push(participant);
        }

        await this.callStore.saveCall(call);

        logger.info(`Added user ${userId} to group call ${callId}`);
        return call;
    }

    /**
     * Remove participant from group call
     */
    async removeParticipant(callId: string, userId: string): Promise<Call> {
        const call = await this.callStore.getCall(callId);

        if (!call) {
            throw new Error('Call not found');
        }

        const participant = call.participants.find(p => p.user_id === userId);
        if (!participant) {
            throw new Error('User is not a participant');
        }

        participant.status = 'disconnected';
        participant.left_at = new Date();

        await this.callStore.saveCall(call);

        // Check if all participants have left
        const activeParticipants = call.participants.filter(
            p => p.status === 'connected' || p.status === 'calling'
        );

        logger.info(`Removed user ${userId} from group call ${callId} (${activeParticipants.length} active remaining)`);

        return call;
    }

    /**
     * Answer group call (join as participant)
     */
    async answerGroupCall(callId: string, userId: string): Promise<Call> {
        const call = await this.callStore.getCall(callId);

        if (!call) {
            throw new Error('Call not found');
        }

        if (call.type !== 'group') {
            throw new Error('Not a group call');
        }

        // Update participant status
        const participant = call.participants.find(p => p.user_id === userId);
        if (!participant) {
            throw new Error('User is not invited to this call');
        }

        participant.status = 'connected';
        participant.joined_at = new Date();

        // If this is the first participant to join, mark call as answered
        if (call.status === 'ringing') {
            call.status = 'answered';
            call.started_at = new Date();
        }

        await this.callStore.saveCall(call);

        logger.info(`User ${userId} joined group call ${callId}`);
        return call;
    }

    /**
     * Get active participants in a group call
     */
    async getActiveParticipants(callId: string): Promise<CallParticipant[]> {
        const call = await this.callStore.getCall(callId);

        if (!call) {
            return [];
        }

        return call.participants.filter(
            p => p.status === 'connected' || p.status === 'calling'
        );
    }

    /**
     * Check if call should end (all participants left)
     */
    async shouldEndCall(callId: string): Promise<boolean> {
        const activeParticipants = await this.getActiveParticipants(callId);
        return activeParticipants.length <= 1; // End if 1 or fewer active
    }
}
