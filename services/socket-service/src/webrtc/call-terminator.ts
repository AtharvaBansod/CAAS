import { Server } from 'socket.io';
import { CallStore } from './call-store';
import { CallHistorySaver } from './call-history-saver';
import { EndReason } from './call-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('CallTerminator');

export class CallTerminator {
    constructor(
        private io: Server,
        private callStore: CallStore,
        private callHistorySaver: CallHistorySaver
    ) { }

    /**
     * End a call
     */
    async endCall(callId: string, endedBy: string, reason: EndReason): Promise<void> {
        try {
            const call = await this.callStore.getCall(callId);

            if (!call) {
                logger.warn(`Cannot end call: Call ${callId} not found`);
                return;
            }

            if (call.status === 'ended' || call.status === 'rejected') {
                logger.warn(`Call ${callId} already ended`);
                return;
            }

            // Update call status
            call.status = 'ended';
            call.ended_at = new Date();
            call.end_reason = reason;
            call.ended_by = endedBy;

            await this.callStore.saveCall(call);

            // Notify all participants
            this.io.to(`call:${callId}`).emit('call:ended', {
                call_id: callId,
                ended_by: endedBy,
                reason,
                ended_at: call.ended_at,
            });

            logger.info(`Call ${callId} ended by ${endedBy} (reason: ${reason})`);

            // Save to history
            await this.callHistorySaver.saveCallHistory(callId);
        } catch (error: any) {
            logger.error(`Failed to end call ${callId}`, error);
            throw error;
        }
    }

    /**
     * Remove a user from a call (for group calls)
     */
    async endCallForUser(callId: string, userId: string): Promise<void> {
        try {
            const call = await this.callStore.getCall(callId);

            if (!call) {
                logger.warn(`Cannot end call for user: Call ${callId} not found`);
                return;
            }

            // Update participant status
            const participant = call.participants.find(p => p.user_id === userId);
            if (participant) {
                participant.status = 'disconnected';
                participant.left_at = new Date();
            }

            // For one-to-one calls, end the entire call
            if (call.type === 'one_to_one') {
                await this.endCall(callId, userId, 'user_hangup');
                return;
            }

            // For group calls, just remove the participant
            await this.callStore.saveCall(call);

            // Notify other participants
            this.io.to(`call:${callId}`).emit('call:participant_left', {
                call_id: callId,
                user_id: userId,
                left_at: participant?.left_at,
            });

            // If no participants left, end the call
            const activeParticipants = call.participants.filter(
                p => p.status === 'connected' || p.status === 'calling'
            );
            if (activeParticipants.length === 0) {
                await this.endCall(callId, userId, 'user_hangup');
            }
        } catch (error: any) {
            logger.error(`Failed to end call for user ${userId} in call ${callId}`, error);
            throw error;
        }
    }

    /**
     * Handle user disconnect - end all their active calls
     */
    async handleDisconnect(userId: string, tenantId: string): Promise<void> {
        try {
            const activeCalls = await this.callStore.getActiveCallsForUser(userId);

            for (const call of activeCalls) {
                logger.info(`Ending call ${call.id} due to user ${userId} disconnect`);
                await this.endCallForUser(call.id, userId);
            }
        } catch (error: any) {
            logger.error(`Failed to handle disconnect for user ${userId}`, error);
        }
    }
}
