import { PresenceManager } from './presence-manager';
import { PresenceStatus, PresenceMetadata } from './presence-types';
import { AuthenticatedSocket } from '../middleware/auth-middleware';

const VALID_PRESENCE_STATUSES: PresenceStatus[] = ['online', 'away', 'busy', 'offline', 'invisible'];

export const registerPresenceEvents = (presenceManager: PresenceManager) => {
  return (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      console.error('AuthenticatedSocket user is not defined.');
      return;
    }

    const userId = socket.user.user_id;
    const tenantId = socket.user.tenant_id; // Assuming tenantId is available on the user object

    // Event for a client to update their own presence status
    socket.on('presence_update', async (data: { status: PresenceStatus; custom_status?: string }) => {
      if (!VALID_PRESENCE_STATUSES.includes(data.status)) {
        console.warn(`Invalid presence status received for user ${userId}: ${data.status}`);
        return;
      }
      await presenceManager.setStatus(userId, data.status, data.custom_status);
      // TODO: Broadcast this status change to relevant subscribers (part of PRESENCE-003)
      console.log(`User ${userId} updated presence to: ${data.status}`);
    });

    // Event for a client to subscribe to another user's presence
    socket.on('presence_subscribe', async (targetUserId: string) => {
      if (!targetUserId) {
        console.warn(`[Presence] Subscribe: targetUserId is undefined for user ${userId}`);
        return;
      }
      await presenceManager.addSubscriber(targetUserId, userId); // userId is the subscriber
      console.log(`User ${userId} subscribed to ${targetUserId}'s presence.`);
      // Optionally, send current status of targetUserId to the subscriber immediately
      const targetPresence = await presenceManager.getStatus(targetUserId);
      if (targetPresence) {
        socket.emit('presence_update_for_subscribed_user', { userId: targetUserId, presence: targetPresence });
      }
    });

    // Event for a client to unsubscribe from another user's presence
    socket.on('presence_unsubscribe', async (targetUserId: string) => {
      if (!targetUserId) {
        console.warn(`[Presence] Unsubscribe: targetUserId is undefined for user ${userId}`);
        return;
      }
      await presenceManager.removeSubscriber(targetUserId, userId); // userId is the subscriber
      console.log(`User ${userId} unsubscribed from ${targetUserId}'s presence.`);
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