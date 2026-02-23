import { Server } from 'socket.io';
import { MongoClient } from 'mongodb';
import { AuthenticatedSocket } from '../middleware/auth-middleware';
import { getLogger } from '../utils/logger';
import { TypingHandler } from '../typing/typing-handler';
import { TypingStateStore } from '../typing/typing-state-store';
import { ReadReceiptHandler } from '../receipts/read-receipt-handler';
import { ReadReceiptStore } from '../receipts/read-receipt-store';
import { UnreadCounter } from '../receipts/unread-counter';
import { DeliveryReceiptHandler } from '../receipts/delivery-receipt-handler';
import { RoomRateLimiter } from '../ratelimit/room-rate-limiter';
import { SpamDetector } from '../abuse/spam-detector';
import { SocketMessageProducer } from '../messaging/kafka-producer';
import { RoomAuthorizer } from '../rooms/room-authorizer';
import { RoomModeration } from '../rooms/room-moderation';
import { RoomStateManager } from '../rooms/room-state-manager';
import { config } from '../config';

const logger = getLogger('ChatNamespace');

// Helper to generate tenant-isolated room names
const getConversationRoomName = (tenantId: string, conversationId: string) =>
  `tenant:${tenantId}:conversation:${conversationId}`;

export function registerChatNamespace(io: Server) {
  const chat = io.of('/chat');

  // Get shared Redis client from server
  const redisClient = (io as any).redisClient;
  
  if (!redisClient) {
    logger.error('Redis client not available in chat namespace');
    return;
  }

  // Initialize Kafka producer for message persistence
  const kafkaProducer = new SocketMessageProducer({
    brokers: config.kafka.brokers,
    clientId: config.kafka.clientId,
    topic: config.kafka.messageTopic,
  });

  kafkaProducer.connect().then(() => {
    logger.info('Kafka producer connected for chat namespace');
  }).catch((err) => {
    logger.error('Failed to connect Kafka producer for chat namespace', err);
  });

  // Initialize MongoDB client for room authorization
  const mongoClient = new MongoClient(config.mongodb.uri);
  mongoClient.connect().then(() => {
    logger.info('MongoDB connected for chat room authorization');
  }).catch((err: any) => {
    logger.error('Failed to connect MongoDB for chat namespace', err);
  });

  // Initialize room authorization and moderation (DRY: reuse existing libraries)
  const roomAuthorizer = new RoomAuthorizer({ redis: redisClient, mongoClient });
  const roomStateManager = new RoomStateManager(redisClient);
  const roomModeration = new RoomModeration(roomAuthorizer, roomStateManager);

  // Initialize handlers with shared Redis client
  const typingStateStore = new TypingStateStore(redisClient);
  const typingHandler = new TypingHandler(io, typingStateStore, 3000);

  const readReceiptStore = new ReadReceiptStore(redisClient);
  const readReceiptHandler = new ReadReceiptHandler(io, readReceiptStore);

  const unreadCounter = new UnreadCounter(redisClient);
  
  // Initialize delivery receipt handler
  const deliveryReceiptHandler = new DeliveryReceiptHandler(io, redisClient);
  
  // Initialize rate limiter and spam detector
  const rateLimiter = new RoomRateLimiter(redisClient);
  const spamDetector = new SpamDetector(redisClient);

  // Graceful shutdown
  const cleanup = async () => {
    await kafkaProducer.disconnect().catch(() => {});
    await mongoClient.close().catch(() => {});
  };
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  chat.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.user_id || socket.user?.sub;
    const tenantId = socket.user?.tenant_id;
    const displayName = (socket.user as any)?.name || (socket.user as any)?.email || userId || 'Unknown';

    logger.info(`[Chat] Client connected: ${socket.id} (User: ${userId}, Tenant: ${tenantId})`);

    if (!userId || !tenantId) {
      logger.warn(`[Chat] Unauthenticated or missing tenantId for socket ${socket.id}. Disconnecting.`);
      socket.disconnect(true);
      return;
    }

    socket.on('joinRoom', async ({ conversationId }: { conversationId: string }, callback: (response: any) => void) => {
      if (!conversationId) {
        logger.warn(`[Chat] User ${userId} (Tenant: ${tenantId}) attempted to join room with no conversationId.`);
        return callback({ status: 'error', message: 'conversationId is required' });
      }

      // Check rate limit for room joins
      const joinLimit = await rateLimiter.checkJoinLimit(userId, tenantId);
      if (!joinLimit.allowed) {
        logger.warn(`[Chat] User ${userId} exceeded join rate limit`);
        return callback({
          status: 'error',
          message: 'Too many room joins. Please try again later.',
          retry_after_ms: joinLimit.retry_after_ms,
        });
      }

      // Authorize room join via RoomAuthorizer (checks membership + ban status in MongoDB)
      const authResult = await roomAuthorizer.canJoinRoom(userId, conversationId, tenantId);
      if (!authResult.authorized) {
        logger.warn(`[Chat] User ${userId} denied joining conversation ${conversationId}: ${authResult.reason}`);
        return callback({ status: 'error', message: authResult.reason || 'Not authorized to join this conversation' });
      }

      const roomName = getConversationRoomName(tenantId, conversationId);

      try {
        await socket.join(roomName);

        // Track membership in room state
        await roomStateManager.addMember(roomName, tenantId, userId, socket.id, (authResult.role as any) || 'member').catch(() => {
          // Room may not exist in state yet — create it
          return roomStateManager.createRoom(roomName, tenantId, conversationId, userId, socket.id);
        });

        logger.info(`[Chat] User ${userId} (Socket: ${socket.id}) joined room: ${roomName} (role: ${authResult.role})`);
        callback({ status: 'ok', room: roomName, role: authResult.role });
      } catch (error: any) {
        logger.error(`[Chat] Failed for user ${userId} (Socket: ${socket.id}) to join room ${roomName}: ${error.message}`);
        callback({ status: 'error', message: `Failed to join room: ${error.message}` });
      }
    });

    socket.on('leaveRoom', async ({ conversationId }: { conversationId: string }, callback: (response: any) => void) => {
      if (!conversationId) {
        logger.warn(`[Chat] User ${userId} (Tenant: ${tenantId}) attempted to leave room with no conversationId.`);
        return callback({ status: 'error', message: 'conversationId is required' });
      }

      const roomName = getConversationRoomName(tenantId, conversationId);

      try {
        await socket.leave(roomName);
        
        // Clear typing state when leaving room
        await typingHandler.handleTypingStop(socket, conversationId, userId, tenantId);
        
        logger.info(`[Chat] User ${userId} (Socket: ${socket.id}) left room: ${roomName}`);
        callback({ status: 'ok', room: roomName });
      } catch (error: any) {
        logger.error(`[Chat] Failed for user ${userId} (Socket: ${socket.id}) to leave room ${roomName}: ${error.message}`);
        callback({ status: 'error', message: `Failed to leave room: ${error.message}` });
      }
    });

    socket.on('sendMessage', async ({ conversationId, messageContent }: { conversationId: string; messageContent: string }, callback: (response: any) => void) => {
      if (!conversationId || !messageContent) {
        logger.warn(`[Chat] User ${userId} (Tenant: ${tenantId}) attempted to send message with missing conversationId or messageContent.`);
        return callback({ status: 'error', message: 'conversationId and messageContent are required' });
      }

      const roomName = getConversationRoomName(tenantId, conversationId);

      // Check if the socket is actually in the room before broadcasting
      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} (Socket: ${socket.id}) attempted to send message to room ${roomName} without being a member.`);
        return callback({ status: 'error', message: 'Not a member of this room' });
      }

      // Check rate limit for messages
      const messageLimit = await rateLimiter.checkMessageLimit(userId, conversationId, tenantId);
      if (!messageLimit.allowed) {
        logger.warn(`[Chat] User ${userId} exceeded message rate limit in room ${conversationId}`);
        return callback({
          status: 'error',
          message: 'Too many messages. Please slow down.',
          retry_after_ms: messageLimit.retry_after_ms,
        });
      }

      // Check for spam
      const spamCheck = await spamDetector.detectSpam(userId, messageContent, tenantId);
      if (spamCheck.is_spam) {
        logger.warn(`[Chat] Spam detected from user ${userId}: ${spamCheck.reasons.join(', ')}`);
        return callback({
          status: 'error',
          message: 'Message rejected: spam detected',
          reasons: spamCheck.reasons,
        });
      }

      // Check for flooding
      const floodCheck = await spamDetector.checkFlood(userId, tenantId);
      if (floodCheck.is_flooding) {
        logger.warn(`[Chat] Flooding detected from user ${userId}: ${floodCheck.request_count}/${floodCheck.threshold}`);
        return callback({
          status: 'error',
          message: 'Too many requests. Please slow down.',
        });
      }

      // Authorize sending: checks membership + mute status
      const sendAuth = await roomAuthorizer.canSendMessage(userId, conversationId, tenantId);
      if (!sendAuth.authorized) {
        logger.warn(`[Chat] User ${userId} denied sending in ${conversationId}: ${sendAuth.reason}`);
        return callback({ status: 'error', message: sendAuth.reason || 'Not authorized to send messages' });
      }

      // Clear typing state when message is sent
      await typingHandler.handleTypingStop(socket, conversationId, userId, tenantId);

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      const timestamp = new Date();
      
      // Get correlation ID from socket
      const { getCorrelationIdFromSocket } = await import('../middleware/correlation.middleware');
      const correlationId = getCorrelationIdFromSocket(socket);
      
      const message = {
        id: messageId,
        senderId: userId,
        senderName: displayName,
        tenantId: tenantId,
        conversationId: conversationId,
        content: messageContent,
        timestamp: timestamp.toISOString(),
      };

      try {
        // 1. Broadcast message to room (real-time delivery via socket)
        chat.to(roomName).emit('message', message);

        // 2. Publish to Kafka for persistence (consumer writes to MongoDB)
        if (kafkaProducer.isConnected()) {
          await kafkaProducer.publishMessage({
            message_id: messageId,
            conversation_id: conversationId,
            tenant_id: tenantId,
            sender_id: userId,
            content: {
              type: 'text',
              text: messageContent,
            },
            timestamp,
            metadata: {
              socket_id: socket.id,
              correlation_id: correlationId,
            },
          });
        } else {
          logger.warn(`[Chat] Kafka producer not connected, message ${messageId} broadcast-only (not persisted)`);
        }

        // Update room activity
        await roomStateManager.updateActivity(roomName, tenantId).catch(() => {});

        logger.info(`[Chat] User ${userId} (Socket: ${socket.id}) sent message to room ${roomName}: ${messageContent.substring(0, 50)}...`);
        callback({ status: 'ok', message: 'Message sent', messageId });
      } catch (error: any) {
        logger.error(`[Chat] Failed for user ${userId} (Socket: ${socket.id}) to send message to room ${roomName}: ${error.message}`);
        callback({ status: 'error', message: `Failed to send message: ${error.message}` });
      }
    });

    // Delivery receipt - client confirms message received
    socket.on('message_delivered', async ({ messageId, conversationId }: { messageId: string; conversationId: string }, callback?: (response: any) => void) => {
      if (!messageId || !conversationId) {
        logger.warn(`[Chat] User ${userId} attempted message_delivered with missing data`);
        if (callback) callback({ status: 'error', message: 'messageId and conversationId are required' });
        return;
      }

      try {
        const receipt = await deliveryReceiptHandler.markAsDelivered(userId, messageId, conversationId);
        
        // Broadcast delivery receipt to conversation (sender will see it)
        deliveryReceiptHandler.broadcastDeliveryReceipt(conversationId, tenantId, receipt, userId);

        if (callback) callback({ status: 'ok', receipt });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark message as delivered: ${error.message}`);
        if (callback) callback({ status: 'error', message: 'Failed to mark message as delivered' });
      }
    });

    // Batch delivery receipt
    socket.on('messages_delivered', async ({ messageIds, conversationId }: { messageIds: string[]; conversationId: string }, callback?: (response: any) => void) => {
      if (!messageIds || !conversationId || messageIds.length === 0) {
        logger.warn(`[Chat] User ${userId} attempted messages_delivered with missing data`);
        if (callback) callback({ status: 'error', message: 'messageIds and conversationId are required' });
        return;
      }

      try {
        const receipts = await deliveryReceiptHandler.markBatchAsDelivered(userId, messageIds, conversationId);
        
        // Broadcast the last receipt (most recent delivery)
        if (receipts.length > 0) {
          const lastReceipt = receipts[receipts.length - 1];
          deliveryReceiptHandler.broadcastDeliveryReceipt(conversationId, tenantId, lastReceipt, userId);
        }

        if (callback) callback({ status: 'ok', count: receipts.length });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark messages as delivered: ${error.message}`);
        if (callback) callback({ status: 'error', message: 'Failed to mark messages as delivered' });
      }
    });

    // Query delivery status
    socket.on('delivery_status', async ({ messageId }: { messageId: string }, callback: (response: any) => void) => {
      if (!messageId) {
        return callback({ status: 'error', message: 'messageId is required' });
      }

      try {
        const deliveryStatus = await deliveryReceiptHandler.getDeliveryStatus(messageId);
        
        if (!deliveryStatus) {
          return callback({ status: 'error', message: 'Message not found' });
        }

        callback({
          status: 'ok',
          delivery_status: deliveryStatus,
        });
      } catch (error: any) {
        logger.error(`[Chat] Failed to query delivery status: ${error.message}`);
        callback({ status: 'error', message: 'Failed to query delivery status' });
      }
    });

    // Typing indicators
    socket.on('typing_start', async ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) {
        logger.warn(`[Chat] User ${userId} attempted typing_start with no conversationId`);
        return;
      }

      const roomName = getConversationRoomName(tenantId, conversationId);

      // Check if user is in the room
      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} attempted typing_start in room ${roomName} without being a member`);
        return;
      }

      // Check rate limit for typing indicators
      const typingLimit = await rateLimiter.checkTypingLimit(userId, tenantId);
      if (!typingLimit.allowed) {
        logger.debug(`[Chat] User ${userId} exceeded typing rate limit`);
        return; // Silently ignore excessive typing indicators
      }

      await typingHandler.handleTypingStart(socket, conversationId, userId, displayName, tenantId);

      // Broadcast to room (excluding sender)
      socket.to(roomName).emit('user_typing', {
        conversation_id: conversationId,
        user: {
          id: userId,
          display_name: displayName,
        },
        is_typing: true,
      });
    });

    socket.on('typing_stop', async ({ conversationId }: { conversationId: string }) => {
      if (!conversationId) {
        logger.warn(`[Chat] User ${userId} attempted typing_stop with no conversationId`);
        return;
      }

      await typingHandler.handleTypingStop(socket, conversationId, userId, tenantId);
    });

    // Query current typing users
    socket.on('typing_query', async ({ conversationId }: { conversationId: string }, callback: (response: any) => void) => {
      if (!conversationId) {
        return callback({ status: 'error', message: 'conversationId is required' });
      }

      try {
        const typingUsers = await typingHandler.getTypingUsers(conversationId);
        // Filter out the requesting user
        const filteredUsers = typingUsers.filter(u => u.user_id !== userId);
        
        callback({
          status: 'ok',
          users: filteredUsers,
          count: filteredUsers.length,
        });
      } catch (error: any) {
        logger.error(`[Chat] Failed to query typing users: ${error.message}`);
        callback({ status: 'error', message: 'Failed to query typing users' });
      }
    });

    // Read receipts
    socket.on('message_read', async ({ messageId, conversationId }: { messageId: string; conversationId: string }, callback?: (response: any) => void) => {
      if (!messageId || !conversationId) {
        logger.warn(`[Chat] User ${userId} attempted message_read with missing data`);
        if (callback) callback({ status: 'error', message: 'messageId and conversationId are required' });
        return;
      }

      const roomName = getConversationRoomName(tenantId, conversationId);

      // Check if user is in the room
      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} attempted message_read in room ${roomName} without being a member`);
        if (callback) callback({ status: 'error', message: 'Not a member of this room' });
        return;
      }

      try {
        const receipt = await readReceiptHandler.markAsRead(userId, conversationId, messageId, tenantId);
        
        // Reset unread count for this conversation
        await unreadCounter.resetUnread(userId, conversationId);

        // Broadcast read receipt to room (excluding sender)
        readReceiptHandler.broadcastReadReceipt(conversationId, tenantId, receipt, userId);

        // Notify user of unread count update
        const totalUnread = await unreadCounter.getTotalUnread(userId);
        socket.emit('unread_count', {
          conversation_id: conversationId,
          count: 0,
          total: totalUnread,
        });

        if (callback) callback({ status: 'ok', receipt });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark message as read: ${error.message}`);
        if (callback) callback({ status: 'error', message: 'Failed to mark message as read' });
      }
    });

    socket.on('messages_read', async ({ messageIds, conversationId }: { messageIds: string[]; conversationId: string }, callback?: (response: any) => void) => {
      if (!messageIds || !conversationId || messageIds.length === 0) {
        logger.warn(`[Chat] User ${userId} attempted messages_read with missing data`);
        if (callback) callback({ status: 'error', message: 'messageIds and conversationId are required' });
        return;
      }

      const roomName = getConversationRoomName(tenantId, conversationId);

      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} attempted messages_read in room ${roomName} without being a member`);
        if (callback) callback({ status: 'error', message: 'Not a member of this room' });
        return;
      }

      try {
        const receipts = await readReceiptHandler.markBatchAsRead(userId, conversationId, messageIds, tenantId);
        
        // Reset unread count
        await unreadCounter.resetUnread(userId, conversationId);

        // Broadcast the last receipt (watermark approach)
        if (receipts.length > 0) {
          const lastReceipt = receipts[receipts.length - 1];
          readReceiptHandler.broadcastReadReceipt(conversationId, tenantId, lastReceipt, userId);
        }

        // Notify user of unread count update
        const totalUnread = await unreadCounter.getTotalUnread(userId);
        socket.emit('unread_count', {
          conversation_id: conversationId,
          count: 0,
          total: totalUnread,
        });

        if (callback) callback({ status: 'ok', count: receipts.length });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark messages as read: ${error.message}`);
        if (callback) callback({ status: 'error', message: 'Failed to mark messages as read' });
      }
    });

    socket.on('conversation_read', async ({ conversationId, upToMessageId }: { conversationId: string; upToMessageId: string }, callback?: (response: any) => void) => {
      if (!conversationId || !upToMessageId) {
        logger.warn(`[Chat] User ${userId} attempted conversation_read with missing data`);
        if (callback) callback({ status: 'error', message: 'conversationId and upToMessageId are required' });
        return;
      }

      const roomName = getConversationRoomName(tenantId, conversationId);

      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} attempted conversation_read in room ${roomName} without being a member`);
        if (callback) callback({ status: 'error', message: 'Not a member of this room' });
        return;
      }

      try {
        await readReceiptHandler.markConversationAsRead(userId, conversationId, upToMessageId, tenantId);
        
        // Reset unread count
        await unreadCounter.resetUnread(userId, conversationId);

        // Broadcast read receipt
        const receipt = {
          message_id: upToMessageId,
          conversation_id: conversationId,
          read_by: userId,
          read_at: new Date(),
        };
        readReceiptHandler.broadcastReadReceipt(conversationId, tenantId, receipt, userId);

        // Notify user of unread count update
        const totalUnread = await unreadCounter.getTotalUnread(userId);
        socket.emit('unread_count', {
          conversation_id: conversationId,
          count: 0,
          total: totalUnread,
        });

        if (callback) callback({ status: 'ok' });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark conversation as read: ${error.message}`);
        if (callback) callback({ status: 'error', message: 'Failed to mark conversation as read' });
      }
    });

    // Query unread counts
    socket.on('unread_query', async (callback: (response: any) => void) => {
      try {
        const allUnread = await unreadCounter.getAllUnreadCounts(userId);
        const totalUnread = await unreadCounter.getTotalUnread(userId);

        const unreadMap: Record<string, number> = {};
        for (const [conversationId, count] of allUnread.entries()) {
          unreadMap[conversationId] = count;
        }

        callback({
          status: 'ok',
          unread: unreadMap,
          total: totalUnread,
        });
      } catch (error: any) {
        logger.error(`[Chat] Failed to query unread counts: ${error.message}`);
        callback({ status: 'error', message: 'Failed to query unread counts' });
      }
    });

    // --- Moderation events (wired to RoomModeration) ---
    socket.on('moderate:kick', async (
      { conversationId, targetUserId, reason }: { conversationId: string; targetUserId: string; reason?: string },
      callback: (response: any) => void
    ) => {
      try {
        await roomModeration.kickUser(userId, targetUserId, conversationId, tenantId, reason);
        const roomName = getConversationRoomName(tenantId, conversationId);
        chat.to(roomName).emit('moderation:kicked', {
          target_user_id: targetUserId,
          moderator_id: userId,
          conversation_id: conversationId,
          reason,
        });
        callback({ status: 'ok' });
      } catch (error: any) {
        callback({ status: 'error', message: error.message });
      }
    });

    socket.on('moderate:ban', async (
      { conversationId, targetUserId, durationSeconds, reason }: { conversationId: string; targetUserId: string; durationSeconds?: number; reason?: string },
      callback: (response: any) => void
    ) => {
      try {
        await roomModeration.banUser(userId, targetUserId, conversationId, tenantId, durationSeconds, reason);
        const roomName = getConversationRoomName(tenantId, conversationId);
        chat.to(roomName).emit('moderation:banned', {
          target_user_id: targetUserId,
          moderator_id: userId,
          conversation_id: conversationId,
          duration_seconds: durationSeconds,
          reason,
        });
        callback({ status: 'ok' });
      } catch (error: any) {
        callback({ status: 'error', message: error.message });
      }
    });

    socket.on('moderate:unban', async (
      { conversationId, targetUserId, reason }: { conversationId: string; targetUserId: string; reason?: string },
      callback: (response: any) => void
    ) => {
      try {
        await roomModeration.unbanUser(userId, targetUserId, conversationId, tenantId, reason);
        callback({ status: 'ok' });
      } catch (error: any) {
        callback({ status: 'error', message: error.message });
      }
    });

    socket.on('moderate:mute', async (
      { conversationId, targetUserId, durationSeconds, reason }: { conversationId: string; targetUserId: string; durationSeconds?: number; reason?: string },
      callback: (response: any) => void
    ) => {
      try {
        await roomModeration.muteUser(userId, targetUserId, conversationId, tenantId, durationSeconds, reason);
        const roomName = getConversationRoomName(tenantId, conversationId);
        chat.to(roomName).emit('moderation:muted', {
          target_user_id: targetUserId,
          moderator_id: userId,
          conversation_id: conversationId,
          duration_seconds: durationSeconds,
          reason,
        });
        callback({ status: 'ok' });
      } catch (error: any) {
        callback({ status: 'error', message: error.message });
      }
    });

    socket.on('moderate:unmute', async (
      { conversationId, targetUserId, reason }: { conversationId: string; targetUserId: string; reason?: string },
      callback: (response: any) => void
    ) => {
      try {
        await roomModeration.unmuteUser(userId, targetUserId, conversationId, tenantId, reason);
        const roomName = getConversationRoomName(tenantId, conversationId);
        chat.to(roomName).emit('moderation:unmuted', {
          target_user_id: targetUserId,
          moderator_id: userId,
          conversation_id: conversationId,
          reason,
        });
        callback({ status: 'ok' });
      } catch (error: any) {
        callback({ status: 'error', message: error.message });
      }
    });

    socket.on('disconnect', () => {
      logger.info(`[Chat] Client disconnected: ${socket.id} (User: ${userId}, Tenant: ${tenantId})`);
      
      // Clear all typing state for this user
      typingHandler.clearUserTyping(userId).catch((err) => {
        logger.error(`Failed to clear typing state for user ${userId}`, err);
      });
    });
  });
}
