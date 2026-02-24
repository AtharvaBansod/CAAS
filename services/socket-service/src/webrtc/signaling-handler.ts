import { AuthenticatedSocket } from '../middleware/auth-middleware';
import { SignalingRelay } from './signaling-relay';
import { RTCSessionDescriptionInit, RTCIceCandidateInit, SignalingValidationError } from './signaling-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('SignalingHandler');

export class SignalingHandler {
    constructor(private signalingRelay: SignalingRelay) { }

    /**
     * Handle SDP offer from caller
     */
    async handleOffer(
        socket: AuthenticatedSocket,
        offer: RTCSessionDescriptionInit,
        targetUserId: string,
        callId?: string
    ): Promise<void> {
        const userId = socket.user?.user_id;

        // Validate SDP
        const errors = this.validateSdp(offer);
        if (errors.length > 0) {
            throw new Error(`Invalid SDP offer: ${errors.map(e => e.message).join(', ')}`);
        }

        logger.info(`User ${userId} sending offer to ${targetUserId}`);

        // Relay offer to target user
        await this.signalingRelay.relayToUser(targetUserId, 'webrtc:offer', {
            from_user_id: userId,
            sdp: offer,
            call_id: callId,
            timestamp: new Date(),
        });
    }

    /**
     * Handle SDP answer from callee
     */
    async handleAnswer(
        socket: AuthenticatedSocket,
        answer: RTCSessionDescriptionInit,
        targetUserId: string,
        callId?: string
    ): Promise<void> {
        const userId = socket.user?.user_id;

        // Validate SDP
        const errors = this.validateSdp(answer);
        if (errors.length > 0) {
            throw new Error(`Invalid SDP answer: ${errors.map(e => e.message).join(', ')}`);
        }

        logger.info(`User ${userId} sending answer to ${targetUserId}`);

        // Relay answer to target user
        await this.signalingRelay.relayToUser(targetUserId, 'webrtc:answer', {
            from_user_id: userId,
            sdp: answer,
            call_id: callId,
            timestamp: new Date(),
        });
    }

    /**
     * Handle ICE candidate
     */
    async handleIceCandidate(
        socket: AuthenticatedSocket,
        candidate: RTCIceCandidateInit,
        targetUserId: string,
        callId?: string
    ): Promise<void> {
        const userId = socket.user?.user_id;

        // Validate ICE candidate
        const errors = this.validateIceCandidate(candidate);
        if (errors.length > 0) {
            throw new Error(`Invalid ICE candidate: ${errors.map(e => e.message).join(', ')}`);
        }

        logger.debug(`User ${userId} sending ICE candidate to ${targetUserId}`);

        // Relay ICE candidate to target user
        await this.signalingRelay.relayToUser(targetUserId, 'webrtc:ice-candidate', {
            from_user_id: userId,
            candidate,
            call_id: callId,
            timestamp: new Date(),
        });
    }

    /**
     * Validate SDP (Session Description Protocol)
     */
    private validateSdp(sdp: RTCSessionDescriptionInit): SignalingValidationError[] {
        const errors: SignalingValidationError[] = [];

        if (!sdp) {
            errors.push({ field: 'sdp', message: 'SDP is required' });
            return errors;
        }

        if (!sdp.type || !['offer', 'answer', 'pranswer', 'rollback'].includes(sdp.type)) {
            errors.push({ field: 'type', message: 'Invalid SDP type' });
        }

        if (!sdp.sdp || typeof sdp.sdp !== 'string') {
            errors.push({ field: 'sdp', message: 'SDP content is required' });
        } else {
            // Basic SDP format validation
            if (!sdp.sdp.includes('v=0')) {
                errors.push({ field: 'sdp', message: 'SDP must include version line (v=0)' });
            }
            if (!sdp.sdp.includes('m=')) {
                errors.push({ field: 'sdp', message: 'SDP must include media description (m=)' });
            }
        }

        return errors;
    }

    /**
     * Validate ICE candidate
     */
    private validateIceCandidate(candidate: RTCIceCandidateInit): SignalingValidationError[] {
        const errors: SignalingValidationError[] = [];

        if (!candidate) {
            errors.push({ field: 'candidate', message: 'ICE candidate is required' });
            return errors;
        }

        // Candidate string can be empty for end-of-candidates indication
        if (candidate.candidate !== undefined && typeof candidate.candidate !== 'string') {
            errors.push({ field: 'candidate', message: 'Candidate must be a string' });
        }

        return errors;
    }
}
