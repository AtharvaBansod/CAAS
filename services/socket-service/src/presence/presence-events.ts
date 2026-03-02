import { PresenceManager } from './presence-manager';
import { PresenceStatus, PresenceMetadata } from './presence-types';
import { AuthenticatedSocket } from '../middleware/auth-middleware';
import { createSocketEventResponder } from '../realtime/socket-response';
import { enforceRealtimeEventGate } from '../realtime/feature-gates';
import { MinimalRedisClient } from '../tokens';

const VALID_PRESENCE_STATUSES: PresenceStatus[] = ['online', 'away', 'busy', 'offline', 'invisible'];
const VALID_PRESENCE_MODES = ['online', 'away', 'dnd', 'invisible'] as const;
const VALID_LAST_SEEN_POLICIES = ['everyone', 'contacts', 'nobody'] as const;

export const registerPresenceEvents = (presenceManager: PresenceManager, redisClient?: MinimalRedisClient) => {
  return (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      console.error('AuthenticatedSocket user is not defined.');
      return;
    }

    const userId = socket.user.user_id;
    const tenantId = socket.user.tenant_id; // Assuming tenantId is available on the user object

    // Event for a client to update their own presence status
    socket.on('presence_update', async (
      data: { status: PresenceStatus; custom_status?: string },
      callback?: (response: unknown) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'presence', 'presence_update', callback);
      if (!enforceRealtimeEventGate({
        namespace: 'presence',
        event: 'presence_update',
        tenantId,
        userId,
      }, respond)) {
        return;
      }

      if (!VALID_PRESENCE_STATUSES.includes(data.status)) {
        console.warn(`Invalid presence status received for user ${userId}: ${data.status}`);
        respond({
          status: 'error',
          message: 'Invalid presence status',
        });
        return;
      }
      await presenceManager.setStatus(userId, data.status, data.custom_status);
      // TODO: Broadcast this status change to relevant subscribers (part of PRESENCE-003)
      console.log(`User ${userId} updated presence to: ${data.status}`);
      respond({
        status: 'ok',
        message: 'Presence updated',
        presence: {
          status: data.status,
          custom_status: data.custom_status,
        },
      });
    });

    // ── RT-SOCK-002: Presence Visibility & Privacy Events ──

    socket.on('presence_mode_set', async (
      data: { mode: string; custom_message?: string },
      callback?: (response: unknown) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'presence', 'presence_mode_set', callback);
      if (!enforceRealtimeEventGate({ namespace: 'presence', event: 'presence_mode_set', tenantId, userId }, respond)) return;
      if (!data.mode || !(VALID_PRESENCE_MODES as readonly string[]).includes(data.mode)) {
        return respond({ status: 'error', message: `Invalid presence mode. Valid: ${VALID_PRESENCE_MODES.join(', ')}` });
      }
      try {
        const modeKey = `presence:mode:${tenantId}:${userId}`;
        if (redisClient) {
          await redisClient.set(modeKey, JSON.stringify({ mode: data.mode, custom_message: data.custom_message || '', updated_at: new Date().toISOString() }));
        }
        // Map mode to presence status for PresenceManager
        const statusMap: Record<string, PresenceStatus> = { online: 'online', away: 'away', dnd: 'busy', invisible: 'invisible' };
        await presenceManager.setStatus(userId, statusMap[data.mode] || 'online', data.custom_message);
        respond({ status: 'ok', message: 'Presence mode updated', mode: data.mode });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to set presence mode: ${error.message}` });
      }
    });

    socket.on('last_seen_policy_set', async (
      data: { policy: string },
      callback?: (response: unknown) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'presence', 'last_seen_policy_set', callback);
      if (!enforceRealtimeEventGate({ namespace: 'presence', event: 'last_seen_policy_set', tenantId, userId }, respond)) return;
      if (!data.policy || !(VALID_LAST_SEEN_POLICIES as readonly string[]).includes(data.policy)) {
        return respond({ status: 'error', message: `Invalid policy. Valid: ${VALID_LAST_SEEN_POLICIES.join(', ')}` });
      }
      try {
        const policyKey = `presence:lastseenpolicy:${tenantId}:${userId}`;
        if (redisClient) {
          await redisClient.set(policyKey, JSON.stringify({ policy: data.policy, updated_at: new Date().toISOString() }));
        }
        respond({ status: 'ok', message: 'Last-seen policy updated', policy: data.policy });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to set last-seen policy: ${error.message}` });
      }
    });

    socket.on('notification_preference_set', async (
      data: { channel: string; enabled: boolean; quiet_hours?: { start: string; end: string } },
      callback?: (response: unknown) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'presence', 'notification_preference_set', callback);
      if (!enforceRealtimeEventGate({ namespace: 'presence', event: 'notification_preference_set', tenantId, userId }, respond)) return;
      if (!data.channel) {
        return respond({ status: 'error', message: 'Notification channel is required' });
      }
      try {
        const prefKey = `presence:notifpref:${tenantId}:${userId}:${data.channel}`;
        if (redisClient) {
          await redisClient.set(prefKey, JSON.stringify({
            channel: data.channel,
            enabled: data.enabled !== false,
            quiet_hours: data.quiet_hours || null,
            updated_at: new Date().toISOString(),
          }));
        }
        respond({ status: 'ok', message: 'Notification preference updated', channel: data.channel, enabled: data.enabled !== false });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to set notification preference: ${error.message}` });
      }
    });

    socket.on('user_block', async (
      data: { target_user_id: string; reason?: string },
      callback?: (response: unknown) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'presence', 'user_block', callback);
      if (!enforceRealtimeEventGate({ namespace: 'presence', event: 'user_block', tenantId, userId }, respond)) return;
      if (!data.target_user_id) {
        return respond({ status: 'error', message: 'target_user_id is required' });
      }
      if (data.target_user_id === userId) {
        return respond({ status: 'error', message: 'Cannot block yourself' });
      }
      try {
        const blockKey = `presence:blocked:${tenantId}:${userId}`;
        if (redisClient) {
          const existing = await redisClient.get(blockKey);
          const blockedList: string[] = existing ? JSON.parse(existing) : [];
          if (!blockedList.includes(data.target_user_id)) {
            blockedList.push(data.target_user_id);
            await redisClient.set(blockKey, JSON.stringify(blockedList));
          }
        }
        respond({ status: 'ok', message: 'User blocked', target_user_id: data.target_user_id });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to block user: ${error.message}` });
      }
    });

    socket.on('user_unblock', async (
      data: { target_user_id: string },
      callback?: (response: unknown) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'presence', 'user_unblock', callback);
      if (!enforceRealtimeEventGate({ namespace: 'presence', event: 'user_unblock', tenantId, userId }, respond)) return;
      if (!data.target_user_id) {
        return respond({ status: 'error', message: 'target_user_id is required' });
      }
      try {
        const blockKey = `presence:blocked:${tenantId}:${userId}`;
        if (redisClient) {
          const existing = await redisClient.get(blockKey);
          const blockedList: string[] = existing ? JSON.parse(existing) : [];
          const filtered = blockedList.filter(id => id !== data.target_user_id);
          await redisClient.set(blockKey, JSON.stringify(filtered));
        }
        respond({ status: 'ok', message: 'User unblocked', target_user_id: data.target_user_id });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to unblock user: ${error.message}` });
      }
    });

    socket.on('user_report', async (
      data: { target_user_id: string; reason: string; details?: string },
      callback?: (response: unknown) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'presence', 'user_report', callback);
      if (!enforceRealtimeEventGate({ namespace: 'presence', event: 'user_report', tenantId, userId }, respond)) return;
      if (!data.target_user_id || !data.reason) {
        return respond({ status: 'error', message: 'target_user_id and reason are required' });
      }
      if (data.target_user_id === userId) {
        return respond({ status: 'error', message: 'Cannot report yourself' });
      }
      try {
        const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const reportKey = `presence:reports:${tenantId}:${reportId}`;
        if (redisClient) {
          await redisClient.set(reportKey, JSON.stringify({
            report_id: reportId,
            reporter_id: userId,
            target_user_id: data.target_user_id,
            reason: data.reason,
            details: data.details || '',
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            status: 'pending',
          }));
        }
        console.log(`[Presence] User report created: ${reportId} by ${userId} against ${data.target_user_id} reason=${data.reason}`);
        respond({ status: 'ok', message: 'Report submitted', report_id: reportId });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to submit report: ${error.message}` });
      }
    });

    // Event for a client disconnecting
    socket.on('disconnect', async (reason: string) => {
      // This is a simplified approach. In a real system, you'd track device IDs
      // and only set offline if all devices are disconnected.
      // For now, we'll assume a single device per socket for simplicity.
      // The setOffline in PresenceManager needs a deviceId.
    // We need to ensure the deviceId is available on the socket.
      const deviceId = socket.deviceId || socket.id; // Use deviceId from authenticated socket or fallback to socket.id
      if (!deviceId) {
        console.error(`[Presence] Disconnect: No deviceId found for user ${userId}, socket ${socket.id}`);
        return;
      }
      await presenceManager.setOffline(userId, deviceId);
      // TODO: Broadcast this status change to relevant subscribers (part of PRESENCE-003)
      console.log(`User ${userId} disconnected. Reason: ${reason}`);
    });

    // Initial presence setting when a socket connects and is authenticated
    // This should ideally be called once the socket is fully authenticated and ready.
    const initialPresenceMetadata: PresenceMetadata = {
      device_id: socket.deviceId || socket.id,
      platform: socket.handshake.headers['user-agent'] as string || 'unknown',
      ip_address: socket.handshake.address,
      last_active: new Date(),
    };
    presenceManager.setOnline(userId, initialPresenceMetadata);
  };
};
