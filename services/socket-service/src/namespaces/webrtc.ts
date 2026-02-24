import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth-middleware';
import { socketAuthMiddleware } from '../middleware/auth-middleware';
import { SignalingHandler } from '../webrtc/signaling-handler';
import { SignalingRelay } from '../webrtc/signaling-relay';
import { IceServerProvider } from '../webrtc/ice-server-provider';
import { CallManager } from '../webrtc/call-manager';
import { CallTerminator } from '../webrtc/call-terminator';
import { CallHistorySaver } from '../webrtc/call-history-saver';
import { CallStore } from '../webrtc/call-store';
import { MediaType } from '../webrtc/call-types';
import { RTCSessionDescriptionInit, RTCIceCandidateInit } from '../webrtc/signaling-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('WebRTCNamespace');

export function registerWebRTCNamespace(io: Server) {
    const webrtcNamespace = io.of('/webrtc');

    // Apply explicit auth middleware for webrtc namespace
    const authClient = (io as any).authClient;
    if (authClient) {
        webrtcNamespace.use(socketAuthMiddleware(authClient));
    } else {
        logger.warn('Auth client not available in WebRTC namespace; relying on upstream auth context');
    }

    // Get Redis client
    const redisClient = (io as any).redisClient;

    if (!redisClient) {
        logger.error('Redis client not available in WebRTC namespace');
        return;
    }

    // Initialize WebRTC components
    const signalingRelay = new SignalingRelay(io, redisClient);
    const signalingHandler = new SignalingHandler(signalingRelay);
    const iceServerProvider = new IceServerProvider();
    const callStore = new CallStore(redisClient);
    const callHistorySaver = new CallHistorySaver(redisClient);
    const callManager = new CallManager(redisClient);
    const callTerminator = new CallTerminator(io, callStore, callHistorySaver);

    webrtcNamespace.on('connection', (socket: AuthenticatedSocket) => {
        const userId = socket.user?.user_id || socket.user?.sub;
        const tenantId = socket.user?.tenant_id;

        logger.info(`[WebRTC] Client connected: ${socket.id} (User: ${userId})`);

        if (!userId || !tenantId) {
            logger.warn(`[WebRTC] Unauthenticated socket ${socket.id}. Disconnecting.`);
            socket.disconnect(true);
            return;
        }

        // Get ICE servers
        socket.on('webrtc:get-ice-servers', async (
            payloadOrCallback?: Record<string, any> | ((response: any) => void),
            maybeCallback?: (response: any) => void
        ) => {
            const callback = typeof payloadOrCallback === 'function'
                ? payloadOrCallback
                : maybeCallback;

            try {
                const iceServers = await iceServerProvider.getIceServers(userId!, tenantId!);
                if (callback) {
                    callback({ status: 'ok', ice_servers: iceServers });
                }
            } catch (error: any) {
                logger.error(`Failed to get ICE servers for user ${userId}`, error);
                if (callback) {
                    callback({ status: 'error', message: 'Failed to get ICE servers' });
                }
            }
        });

        // SDP Offer
        socket.on('webrtc:offer', async (
            data: { target_user_id: string; sdp: RTCSessionDescriptionInit; call_id?: string },
            callback?: (response: any) => void
        ) => {
            try {
                await signalingHandler.handleOffer(socket, data.sdp, data.target_user_id, data.call_id);
                if (callback) callback({ status: 'ok' });
            } catch (error: any) {
                logger.error(`Failed to handle offer from ${userId}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });

        // SDP Answer
        socket.on('webrtc:answer', async (
            data: { target_user_id: string; sdp: RTCSessionDescriptionInit; call_id?: string },
            callback?: (response: any) => void
        ) => {
            try {
                await signalingHandler.handleAnswer(socket, data.sdp, data.target_user_id, data.call_id);
                if (callback) callback({ status: 'ok' });
            } catch (error: any) {
                logger.error(`Failed to handle answer from ${userId}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });

        // ICE Candidate
        socket.on('webrtc:ice-candidate', async (
            data: { target_user_id: string; candidate: RTCIceCandidateInit; call_id?: string },
            callback?: (response: any) => void
        ) => {
            try {
                await signalingHandler.handleIceCandidate(socket, data.candidate, data.target_user_id, data.call_id);
                if (callback) callback({ status: 'ok' });
            } catch (error: any) {
                logger.error(`Failed to handle ICE candidate from ${userId}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });

        // Initiate call
        socket.on('call:initiate', async (
            data: { callee_id: string; media_type: MediaType },
            callback: (response: any) => void
        ) => {
            try {
                const call = await callManager.initiateCall(userId!, data.callee_id, data.media_type, tenantId!);

                // Join call room
                socket.join(`call:${call.id}`);

                // Notify callee
                await signalingRelay.relayToUser(data.callee_id, 'call:incoming', {
                    call_id: call.id,
                    caller_id: userId,
                    media_type: data.media_type,
                    created_at: call.created_at,
                });

                callback({ status: 'ok', call_id: call.id, call });
            } catch (error: any) {
                logger.error(`Failed to initiate call from ${userId} to ${data.callee_id}`, error);
                callback({ status: 'error', message: error.message });
            }
        });

        // Answer call
        socket.on('call:answer', async (
            data: { call_id: string },
            callback?: (response: any) => void
        ) => {
            try {
                const call = await callManager.answerCall(data.call_id, userId!);

                // Join call room
                socket.join(`call:${data.call_id}`);

                // Notify caller
                socket.to(`call:${data.call_id}`).emit('call:answered', {
                    call_id: data.call_id,
                    user_id: userId,
                    answered_at: call.started_at,
                });

                if (callback) callback({ status: 'ok', call });
            } catch (error: any) {
                logger.error(`Failed to answer call ${data.call_id}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });

        // Reject call
        socket.on('call:reject', async (
            data: { call_id: string; reason?: string },
            callback?: (response: any) => void
        ) => {
            try {
                await callManager.rejectCall(data.call_id, userId!, data.reason);

                // Notify caller
                socket.to(`call:${data.call_id}`).emit('call:rejected', {
                    call_id: data.call_id,
                    user_id: userId,
                    reason: data.reason,
                });

                if (callback) callback({ status: 'ok' });
            } catch (error: any) {
                logger.error(`Failed to reject call ${data.call_id}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });

        // Hang up / End call
        socket.on('call:hangup', async (
            data: { call_id: string },
            callback?: (response: any) => void
        ) => {
            try {
                await callTerminator.endCall(data.call_id, userId!, 'user_hangup');

                // Leave call room
                socket.leave(`call:${data.call_id}`);

                if (callback) callback({ status: 'ok' });
            } catch (error: any) {
                logger.error(`Failed to hang up call ${data.call_id}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });

        // Handle disconnect
        socket.on('disconnect', async () => {
            logger.info(`[WebRTC] Client disconnected: ${socket.id} (User: ${userId})`);

            // End all active calls for this user
            await callTerminator.handleDisconnect(userId!, tenantId!);
        });

        // --- Screen Sharing ---
        socket.on('screen:start', async (
            data: { call_id: string },
            callback?: (response: any) => void
        ) => {
            try {
                // Notify other participants that screen sharing started
                socket.to(`call:${data.call_id}`).emit('screen:started', {
                    call_id: data.call_id,
                    user_id: userId,
                    started_at: new Date().toISOString(),
                });

                logger.info(`[WebRTC] User ${userId} started screen sharing in call ${data.call_id}`);
                if (callback) callback({ status: 'ok' });
            } catch (error: any) {
                logger.error(`Failed to start screen sharing for ${userId}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });

        socket.on('screen:stop', async (
            data: { call_id: string },
            callback?: (response: any) => void
        ) => {
            try {
                // Notify other participants that screen sharing stopped
                socket.to(`call:${data.call_id}`).emit('screen:stopped', {
                    call_id: data.call_id,
                    user_id: userId,
                    stopped_at: new Date().toISOString(),
                });

                logger.info(`[WebRTC] User ${userId} stopped screen sharing in call ${data.call_id}`);
                if (callback) callback({ status: 'ok' });
            } catch (error: any) {
                logger.error(`Failed to stop screen sharing for ${userId}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });

        // Screen share offer (separate SDP for screen track)
        socket.on('screen:offer', async (
            data: { target_user_id: string; sdp: RTCSessionDescriptionInit; call_id: string },
            callback?: (response: any) => void
        ) => {
            try {
                await signalingRelay.relayToUser(data.target_user_id, 'screen:offer', {
                    sdp: data.sdp,
                    call_id: data.call_id,
                    from_user_id: userId,
                });
                if (callback) callback({ status: 'ok' });
            } catch (error: any) {
                logger.error(`Failed to relay screen offer from ${userId}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });

        socket.on('screen:answer', async (
            data: { target_user_id: string; sdp: RTCSessionDescriptionInit; call_id: string },
            callback?: (response: any) => void
        ) => {
            try {
                await signalingRelay.relayToUser(data.target_user_id, 'screen:answer', {
                    sdp: data.sdp,
                    call_id: data.call_id,
                    from_user_id: userId,
                });
                if (callback) callback({ status: 'ok' });
            } catch (error: any) {
                logger.error(`Failed to relay screen answer from ${userId}`, error);
                if (callback) callback({ status: 'error', message: error.message });
            }
        });
    });

    logger.info('WebRTC namespace registered');
}
