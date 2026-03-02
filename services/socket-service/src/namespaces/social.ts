import { Server } from 'socket.io';
import { AuthenticatedSocket, socketAuthMiddleware } from '../middleware/auth-middleware';
import { createSocketEventResponder } from '../realtime/socket-response';
import { enforceRealtimeEventGate } from '../realtime/feature-gates';

export function registerSocialNamespace(io: Server) {
  const social = io.of('/social');

  const redisClient = (io as any).redisClient;
  const authClient = (io as any).authClient;

  if (!redisClient) {
    console.error('[Social] Redis client not available');
    return;
  }

  if (authClient) {
    social.use(socketAuthMiddleware(authClient));
  } else {
    console.warn('[Social] Auth client not available; relying on upstream auth context');
  }

  function ensureEventEnabled(event: string, respond: (d: any) => void): boolean {
    return enforceRealtimeEventGate({ namespace: 'social', event, tenantId: '', userId: '' }, respond);
  }

  social.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.user_id || 'anonymous';
    const tenantId = socket.user?.tenant_id || 'unknown';
    const projectId = socket.user?.project_id || 'default';
    console.log(`[Social] Client connected: ${socket.id} user=${userId}`);

    // ── RT-SOCK-003: Media & Social Interaction Events ──

    socket.on('post_like', async (
      data: { post_id: string; action?: 'like' | 'unlike' },
      callback?: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'social', 'post_like', callback);
      if (!enforceRealtimeEventGate({ namespace: 'social', event: 'post_like', tenantId, userId }, respond)) return;
      if (!data.post_id) return respond({ status: 'error', message: 'post_id is required' });
      try {
        const likeAction = data.action || 'like';
        const likeKey = `social:likes:${tenantId}:${data.post_id}`;
        const userLikeKey = `social:user_likes:${tenantId}:${userId}:${data.post_id}`;
        if (likeAction === 'like') {
          await redisClient.set(userLikeKey, '1');
          await redisClient.incr(likeKey);
        } else {
          const exists = await redisClient.get(userLikeKey);
          if (exists) {
            await redisClient.del(userLikeKey);
            await redisClient.decr(likeKey);
          }
        }
        const count = await redisClient.get(likeKey);
        // Broadcast to all connected social clients in this tenant
        social.emit('post_liked', {
          post_id: data.post_id,
          user_id: userId,
          action: likeAction,
          like_count: parseInt(count || '0', 10),
          timestamp: new Date().toISOString(),
        });
        respond({ status: 'ok', message: `Post ${likeAction}d`, post_id: data.post_id, like_count: parseInt(count || '0', 10) });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to process like: ${error.message}` });
      }
    });

    socket.on('post_comment', async (
      data: { post_id: string; content: string; parent_comment_id?: string },
      callback?: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'social', 'post_comment', callback);
      if (!enforceRealtimeEventGate({ namespace: 'social', event: 'post_comment', tenantId, userId }, respond)) return;
      if (!data.post_id || !data.content) return respond({ status: 'error', message: 'post_id and content are required' });
      try {
        const commentId = `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const comment = {
          comment_id: commentId,
          post_id: data.post_id,
          user_id: userId,
          tenant_id: tenantId,
          content: data.content,
          parent_comment_id: data.parent_comment_id || null,
          created_at: new Date().toISOString(),
        };
        const commentKey = `social:comments:${tenantId}:${data.post_id}:${commentId}`;
        await redisClient.set(commentKey, JSON.stringify(comment));
        social.emit('post_commented', comment);
        respond({ status: 'ok', message: 'Comment added', comment_id: commentId });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to add comment: ${error.message}` });
      }
    });

    socket.on('post_save', async (
      data: { post_id: string; saved?: boolean },
      callback?: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'social', 'post_save', callback);
      if (!enforceRealtimeEventGate({ namespace: 'social', event: 'post_save', tenantId, userId }, respond)) return;
      if (!data.post_id) return respond({ status: 'error', message: 'post_id is required' });
      try {
        const saveKey = `social:saved:${tenantId}:${userId}:${data.post_id}`;
        if (data.saved !== false) {
          await redisClient.set(saveKey, JSON.stringify({ saved_at: new Date().toISOString() }));
        } else {
          await redisClient.del(saveKey);
        }
        respond({ status: 'ok', message: data.saved !== false ? 'Post saved' : 'Post unsaved', post_id: data.post_id });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to save post: ${error.message}` });
      }
    });

    socket.on('post_share', async (
      data: { post_id: string; target_conversation_id?: string; visibility?: string },
      callback?: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'social', 'post_share', callback);
      if (!enforceRealtimeEventGate({ namespace: 'social', event: 'post_share', tenantId, userId }, respond)) return;
      if (!data.post_id) return respond({ status: 'error', message: 'post_id is required' });
      try {
        const shareId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const shareKey = `social:shares:${tenantId}:${data.post_id}`;
        await redisClient.incr(shareKey);
        const count = await redisClient.get(shareKey);
        social.emit('post_shared', {
          share_id: shareId,
          post_id: data.post_id,
          user_id: userId,
          target_conversation_id: data.target_conversation_id || null,
          visibility: data.visibility || 'public',
          share_count: parseInt(count || '0', 10),
          timestamp: new Date().toISOString(),
        });
        respond({ status: 'ok', message: 'Post shared', share_id: shareId, share_count: parseInt(count || '0', 10) });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to share post: ${error.message}` });
      }
    });

    socket.on('story_view', async (
      data: { story_id: string },
      callback?: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'social', 'story_view', callback);
      if (!enforceRealtimeEventGate({ namespace: 'social', event: 'story_view', tenantId, userId }, respond)) return;
      if (!data.story_id) return respond({ status: 'error', message: 'story_id is required' });
      try {
        const viewKey = `social:story_views:${tenantId}:${data.story_id}`;
        const viewerKey = `social:story_viewers:${tenantId}:${data.story_id}:${userId}`;
        const alreadyViewed = await redisClient.get(viewerKey);
        if (!alreadyViewed) {
          await redisClient.set(viewerKey, new Date().toISOString());
          await redisClient.incr(viewKey);
        }
        const count = await redisClient.get(viewKey);
        respond({ status: 'ok', message: 'Story viewed', story_id: data.story_id, view_count: parseInt(count || '0', 10) });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to record story view: ${error.message}` });
      }
    });

    socket.on('story_react', async (
      data: { story_id: string; reaction: string },
      callback?: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'social', 'story_react', callback);
      if (!enforceRealtimeEventGate({ namespace: 'social', event: 'story_react', tenantId, userId }, respond)) return;
      if (!data.story_id || !data.reaction) return respond({ status: 'error', message: 'story_id and reaction are required' });
      try {
        const reactKey = `social:story_reactions:${tenantId}:${data.story_id}:${userId}`;
        await redisClient.set(reactKey, JSON.stringify({ reaction: data.reaction, timestamp: new Date().toISOString() }));
        social.emit('story_reacted', {
          story_id: data.story_id,
          user_id: userId,
          reaction: data.reaction,
          timestamp: new Date().toISOString(),
        });
        respond({ status: 'ok', message: 'Story reaction recorded', story_id: data.story_id, reaction: data.reaction });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to react to story: ${error.message}` });
      }
    });

    socket.on('media_viewer_sync', async (
      data: { media_id: string; position_ms: number; state: 'playing' | 'paused' | 'seeking'; room_id?: string },
      callback?: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'social', 'media_viewer_sync', callback);
      if (!enforceRealtimeEventGate({ namespace: 'social', event: 'media_viewer_sync', tenantId, userId }, respond)) return;
      if (!data.media_id || data.position_ms === undefined) return respond({ status: 'error', message: 'media_id and position_ms are required' });
      try {
        const syncRoom = data.room_id || `media_sync:${tenantId}:${data.media_id}`;
        // Auto-join sync room for this media
        socket.join(syncRoom);
        const syncState = {
          media_id: data.media_id,
          position_ms: data.position_ms,
          state: data.state || 'playing',
          user_id: userId,
          timestamp: new Date().toISOString(),
        };
        // Broadcast to others in the sync room
        socket.to(syncRoom).emit('media_sync_update', syncState);
        // Store current state in Redis
        const syncKey = `social:media_sync:${tenantId}:${data.media_id}`;
        await redisClient.set(syncKey, JSON.stringify(syncState));
        respond({ status: 'ok', message: 'Media sync updated', ...syncState });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to sync media: ${error.message}` });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Social] Client disconnected: ${socket.id} user=${userId}`);
    });
  });

  return social;
}
