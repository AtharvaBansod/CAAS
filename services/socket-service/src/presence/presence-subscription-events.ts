import { Socket } from 'socket.io';
import { PresenceSubscriber } from './presence-subscriber';
import { PresenceAuthorizer } from './presence-authorizer';
import { PresenceManager } from './presence-manager';
import { getLogger } from '../utils/logger';

const logger = getLogger('PresenceSubscriptionEvents');

export function registerPresenceSubscriptionEvents(
  socket: Socket,
  subscriber: PresenceSubscriber,
  authorizer: PresenceAuthorizer,
  presenceManager: PresenceManager
): void {
  /**
   * Subscribe to presence updates for specific users
   */
  socket.on('presence_subscribe', async (data: { user_ids: string[] }, callback) => {
    try {
      const userId = socket.data.user?.id;
      const tenantId = socket.data.tenantId;

      if (!userId || !tenantId) {
        callback?.({ success: false, error: 'Not authenticated' });
        return;
      }

      if (!data.user_ids || !Array.isArray(data.user_ids) || data.user_ids.length === 0) {
        callback?.({ success: false, error: 'Invalid user_ids' });
        return;
      }

      // Check authorization for each user
      const allowedUserIds = await authorizer.canSubscribeToPresence(userId, data.user_ids, tenantId);

      if (allowedUserIds.length === 0) {
        callback?.({ success: false, error: 'Not authorized to subscribe to any of the specified users' });
        return;
      }

      // Subscribe to allowed users
      await subscriber.subscribe(userId, allowedUserIds);

      // Get current presence status for subscribed users
      const statuses = await presenceManager.getBulkStatus(allowedUserIds);

      callback?.({
        success: true,
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
      callback?.({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * Unsubscribe from presence updates for specific users
   */
  socket.on('presence_unsubscribe', async (data: { user_ids: string[] }, callback) => {
    try {
      const userId = socket.data.user?.id;

      if (!userId) {
        callback?.({ success: false, error: 'Not authenticated' });
        return;
      }

      if (!data.user_ids || !Array.isArray(data.user_ids) || data.user_ids.length === 0) {
        callback?.({ success: false, error: 'Invalid user_ids' });
        return;
      }

      await subscriber.unsubscribe(userId, data.user_ids);

      callback?.({
        success: true,
        unsubscribed_from: data.user_ids,
      });

      logger.info(`User ${userId} unsubscribed from presence of ${data.user_ids.length} users`);
    } catch (error: any) {
      logger.error('Error handling presence_unsubscribe', error);
      callback?.({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * Query current subscriptions
   */
  socket.on('presence_subscriptions_query', async (callback) => {
    try {
      const userId = socket.data.user?.id;

      if (!userId) {
        callback?.({ success: false, error: 'Not authenticated' });
        return;
      }

      const subscriptions = await subscriber.getSubscriptions(userId);
      const count = subscriptions.length;

      callback?.({
        success: true,
        subscriptions,
        count,
      });
    } catch (error: any) {
      logger.error('Error handling presence_subscriptions_query', error);
      callback?.({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * Cleanup subscriptions on disconnect
   */
  socket.on('disconnect', async () => {
    try {
      const userId = socket.data.user?.id;

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
