import { AuthenticatedSocket } from '../middleware/auth-middleware';
import { PresenceSubscriber } from './presence-subscriber';
import { PresenceAuthorizer } from './presence-authorizer';
import { PresenceManager } from './presence-manager';
import { getLogger } from '../utils/logger';
import { createSocketEventResponder } from '../realtime/socket-response';
import { enforceRealtimeEventGate } from '../realtime/feature-gates';

const logger = getLogger('PresenceSubscriptionEvents');

export function registerPresenceSubscriptionEvents(
  socket: AuthenticatedSocket,
  subscriber: PresenceSubscriber,
  authorizer: PresenceAuthorizer,
  presenceManager: PresenceManager
): void {
  const getSocketUserId = (): string | undefined => {
    return socket.user?.user_id;
  };

  const getSocketTenantId = (): string | undefined => {
    return socket.user?.tenant_id;
  };

  /**
   * Subscribe to presence updates for specific users
   */
  socket.on('presence_subscribe', async (data: { user_ids: string[] }, callback?: unknown) => {
    const respond = createSocketEventResponder(socket, 'presence', 'presence_subscribe', typeof callback === 'function' ? callback : undefined);
    if (!enforceRealtimeEventGate({
      namespace: 'presence',
      event: 'presence_subscribe',
      tenantId: getSocketTenantId(),
      userId: getSocketUserId(),
    }, respond)) {
      return;
    }
    try {
      const userId = getSocketUserId();
      const tenantId = getSocketTenantId();

      if (!userId || !tenantId) {
        respond({ status: 'error', message: 'Not authenticated' });
        return;
      }

      if (!data.user_ids || !Array.isArray(data.user_ids) || data.user_ids.length === 0) {
        respond({ status: 'error', message: 'Invalid user_ids' });
        return;
      }

      // Check authorization for each user
      const allowedUserIds = await authorizer.canSubscribeToPresence(userId, data.user_ids, tenantId);

      if (allowedUserIds.length === 0) {
        respond({ status: 'error', message: 'Not authorized to subscribe to any of the specified users' });
        return;
      }

      // Subscribe to allowed users
      await subscriber.subscribe(userId, allowedUserIds);

      // Get current presence status for subscribed users
      const statuses = await presenceManager.getBulkStatus(allowedUserIds);

      respond({
        status: 'ok',
        message: 'Presence subscriptions updated',
        subscribed_to: allowedUserIds,
        denied: data.user_ids.filter(id => !allowedUserIds.includes(id)),
        statuses: Array.from(statuses.entries()).map(([userId, presence]) => ({
          user_id: userId,
          status: presence.status,
          custom_status: presence.custom_status,
          last_seen: presence.last_seen,
        })),
      });

      logger.info(`User ${userId} subscribed to presence of ${allowedUserIds.length} users`);
    } catch (error: any) {
      logger.error('Error handling presence_subscribe', error);
      respond({ status: 'error', message: 'Internal server error' });
    }
  });

  /**
   * Unsubscribe from presence updates for specific users
   */
  socket.on('presence_unsubscribe', async (data: { user_ids: string[] }, callback?: unknown) => {
    const respond = createSocketEventResponder(socket, 'presence', 'presence_unsubscribe', typeof callback === 'function' ? callback : undefined);
    if (!enforceRealtimeEventGate({
      namespace: 'presence',
      event: 'presence_unsubscribe',
      tenantId: getSocketTenantId(),
      userId: getSocketUserId(),
    }, respond)) {
      return;
    }
    try {
      const userId = getSocketUserId();

      if (!userId) {
        respond({ status: 'error', message: 'Not authenticated' });
        return;
      }

      if (!data.user_ids || !Array.isArray(data.user_ids) || data.user_ids.length === 0) {
        respond({ status: 'error', message: 'Invalid user_ids' });
        return;
      }

      await subscriber.unsubscribe(userId, data.user_ids);

      respond({
        status: 'ok',
        message: 'Presence subscriptions removed',
        unsubscribed_from: data.user_ids,
      });

      logger.info(`User ${userId} unsubscribed from presence of ${data.user_ids.length} users`);
    } catch (error: any) {
      logger.error('Error handling presence_unsubscribe', error);
      respond({ status: 'error', message: 'Internal server error' });
    }
  });

  /**
   * Query current subscriptions
   */
  socket.on('presence_subscriptions_query', async (payloadOrCallback?: unknown, maybeCallback?: unknown) => {
    const callback = typeof payloadOrCallback === 'function' ? payloadOrCallback : maybeCallback;
    const respond = createSocketEventResponder(socket, 'presence', 'presence_subscriptions_query', typeof callback === 'function' ? callback : undefined);
    if (!enforceRealtimeEventGate({
      namespace: 'presence',
      event: 'presence_subscriptions_query',
      tenantId: getSocketTenantId(),
      userId: getSocketUserId(),
    }, respond)) {
      return;
    }

    try {
      const userId = getSocketUserId();

      if (!userId) {
        respond({ status: 'error', message: 'Not authenticated' });
        return;
      }

      const subscriptions = await subscriber.getSubscriptions(userId);
      const count = subscriptions.length;

      respond({
        status: 'ok',
        message: 'Presence subscriptions loaded',
        subscriptions,
        count,
      });
    } catch (error: any) {
      logger.error('Error handling presence_subscriptions_query', error);
      respond({ status: 'error', message: 'Internal server error' });
    }
  });

  /**
   * Cleanup subscriptions on disconnect
   */
  socket.on('disconnect', async () => {
    try {
      const userId = getSocketUserId();

      if (userId) {
        // Optionally unsubscribe all on disconnect
        // Or keep subscriptions for reconnection
        // For now, we keep subscriptions
        logger.debug(`User ${userId} disconnected, keeping presence subscriptions`);
      }
    } catch (error: any) {
      logger.error('Error handling disconnect for presence subscriptions', error);
    }
  });
}
