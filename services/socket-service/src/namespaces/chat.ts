import { Server } from 'socket.io';
import { MongoClient } from 'mongodb';
import { AuthenticatedSocket } from '../middleware/auth-middleware';
import { socketAuthMiddleware } from '../middleware/auth-middleware';
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
import { createSocketEventResponder } from '../realtime/socket-response';
import { getProjectScopedRoomName } from '../realtime/project-context';
import { enforceRealtimeEventGate } from '../realtime/feature-gates';

const logger = getLogger('ChatNamespace');

const getConversationRoomName = (tenantId: string, conversationId: string, projectId: string = 'default') =>
  getProjectScopedRoomName(tenantId, projectId, 'conversation', conversationId);

export function registerChatNamespace(io: Server) {
  const chat = io.of('/chat');

  // Apply explicit auth middleware for chat namespace
  const authClient = (io as any).authClient;
  if (authClient) {
    chat.use(socketAuthMiddleware(authClient));
  } else {
    logger.warn('Auth client not available in chat namespace; relying on upstream auth context');
  }

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
    await kafkaProducer.disconnect().catch(() => { });
    await mongoClient.close().catch(() => { });
  };
  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  chat.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user?.user_id;
    const tenantId = socket.user?.tenant_id;
    const projectId = socket.user?.project_id || 'default';
    const displayName = (socket.user as any)?.name || (socket.user as any)?.email || userId || 'Unknown';

    logger.info(`[Chat] Client connected: ${socket.id} (User: ${userId}, Tenant: ${tenantId}, Project: ${projectId})`);

    if (!userId || !tenantId) {
      logger.warn(`[Chat] Unauthenticated or missing tenantId for socket ${socket.id}. Disconnecting.`);
      socket.disconnect(true);
      return;
    }

    const ensureEventEnabled = (event: string, respond: (response: Record<string, unknown>) => void): boolean =>
      enforceRealtimeEventGate(
        {
          namespace: 'chat',
          event,
          tenantId,
          userId,
        },
        respond
      );

    socket.on('joinRoom', async ({ conversationId }: { conversationId: string }, callback: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'joinRoom', callback);
      if (!ensureEventEnabled('joinRoom', respond)) {
        return;
      }
      if (!conversationId) {
        logger.warn(`[Chat] User ${userId} (Tenant: ${tenantId}) attempted to join room with no conversationId.`);
        return respond({ status: 'error', message: 'conversationId is required' });
      }

      // Check rate limit for room joins
      const joinLimit = await rateLimiter.checkJoinLimit(userId, tenantId);
      if (!joinLimit.allowed) {
        logger.warn(`[Chat] User ${userId} exceeded join rate limit`);
        return respond({
          status: 'error',
          message: 'Too many room joins. Please try again later.',
          retry_after_ms: joinLimit.retry_after_ms,
        });
      }

      // Authorize room join via RoomAuthorizer (checks membership + ban status in MongoDB)
      const authResult = await roomAuthorizer.canJoinRoom(userId, conversationId, tenantId, projectId);
      if (!authResult.authorized) {
        logger.warn(`[Chat] User ${userId} denied joining conversation ${conversationId}: ${authResult.reason}`);
        return respond({
          status: 'error',
          code: authResult.code || 'FORBIDDEN',
          message: authResult.reason || 'Not authorized to join this conversation',
        });
      }

      const roomName = getConversationRoomName(tenantId, conversationId, projectId);

      try {
        await socket.join(roomName);

        // Track membership in room state
        await roomStateManager.addMember(roomName, tenantId, userId, socket.id, (authResult.role as any) || 'member').catch(() => {
          // Room may not exist in state yet — create it
          return roomStateManager.createRoom(roomName, tenantId, conversationId, userId, socket.id);
        });

        logger.info(`[Chat] User ${userId} (Socket: ${socket.id}) joined room: ${roomName} (role: ${authResult.role})`);
        respond({ status: 'ok', message: 'Room joined', room: roomName, role: authResult.role, project_id: projectId });
      } catch (error: any) {
        logger.error(`[Chat] Failed for user ${userId} (Socket: ${socket.id}) to join room ${roomName}: ${error.message}`);
        respond({ status: 'error', message: `Failed to join room: ${error.message}` });
      }
    });

    socket.on('leaveRoom', async ({ conversationId }: { conversationId: string }, callback: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'leaveRoom', callback);
      if (!ensureEventEnabled('leaveRoom', respond)) {
        return;
      }
      if (!conversationId) {
        logger.warn(`[Chat] User ${userId} (Tenant: ${tenantId}) attempted to leave room with no conversationId.`);
        return respond({ status: 'error', message: 'conversationId is required' });
      }

      const roomName = getConversationRoomName(tenantId, conversationId, projectId);

      try {
        await socket.leave(roomName);

        // Clear typing state when leaving room
        await typingHandler.handleTypingStop(socket, conversationId, userId, tenantId);

        logger.info(`[Chat] User ${userId} (Socket: ${socket.id}) left room: ${roomName}`);
        respond({ status: 'ok', message: 'Room left', room: roomName });
      } catch (error: any) {
        logger.error(`[Chat] Failed for user ${userId} (Socket: ${socket.id}) to leave room ${roomName}: ${error.message}`);
        respond({ status: 'error', message: `Failed to leave room: ${error.message}` });
      }
    });

    socket.on('sendMessage', async ({ conversationId, messageContent }: { conversationId: string; messageContent: string }, callback: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'sendMessage', callback);
      if (!ensureEventEnabled('sendMessage', respond)) {
        return;
      }
      if (!conversationId || !messageContent) {
        logger.warn(`[Chat] User ${userId} (Tenant: ${tenantId}) attempted to send message with missing conversationId or messageContent.`);
        return respond({ status: 'error', message: 'conversationId and messageContent are required' });
      }

      const roomName = getConversationRoomName(tenantId, conversationId, projectId);

      // Check if the socket is actually in the room before broadcasting
      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} (Socket: ${socket.id}) attempted to send message to room ${roomName} without being a member.`);
        return respond({ status: 'error', message: 'Not a member of this room' });
      }

      // Check rate limit for messages
      const messageLimit = await rateLimiter.checkMessageLimit(userId, conversationId, tenantId);
      if (!messageLimit.allowed) {
        logger.warn(`[Chat] User ${userId} exceeded message rate limit in room ${conversationId}`);
        return respond({
          status: 'error',
          message: 'Too many messages. Please slow down.',
          retry_after_ms: messageLimit.retry_after_ms,
        });
      }

      // Check for spam
      const spamCheck = await spamDetector.detectSpam(userId, messageContent, tenantId);
      if (spamCheck.is_spam) {
        logger.warn(`[Chat] Spam detected from user ${userId}: ${spamCheck.reasons.join(', ')}`);
        return respond({
          status: 'error',
          message: 'Message rejected: spam detected',
          reasons: spamCheck.reasons,
        });
      }

      // Check for flooding
      const floodCheck = await spamDetector.checkFlood(userId, tenantId);
      if (floodCheck.is_flooding) {
        logger.warn(`[Chat] Flooding detected from user ${userId}: ${floodCheck.request_count}/${floodCheck.threshold}`);
        return respond({
          status: 'error',
          message: 'Too many requests. Please slow down.',
        });
      }

      // Authorize sending: checks membership + mute status
      const sendAuth = await roomAuthorizer.canSendMessage(userId, conversationId, tenantId, projectId);
      if (!sendAuth.authorized) {
        logger.warn(`[Chat] User ${userId} denied sending in ${conversationId}: ${sendAuth.reason}`);
        return respond({
          status: 'error',
          code: sendAuth.code || 'FORBIDDEN',
          message: sendAuth.reason || 'Not authorized to send messages',
        });
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
            project_id: projectId,
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
        await roomStateManager.updateActivity(roomName, tenantId).catch(() => { });

        logger.info(`[Chat] User ${userId} (Socket: ${socket.id}) sent message to room ${roomName}: ${messageContent.substring(0, 50)}...`);
        respond({ status: 'ok', message: 'Message sent', messageId, conversation_id: conversationId, project_id: projectId });
      } catch (error: any) {
        logger.error(`[Chat] Failed for user ${userId} (Socket: ${socket.id}) to send message to room ${roomName}: ${error.message}`);
        respond({ status: 'error', message: `Failed to send message: ${error.message}` });
      }
    });

    // Delivery receipt - client confirms message received
    socket.on('message_delivered', async ({ messageId, conversationId }: { messageId: string; conversationId: string }, callback?: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'message_delivered', callback);
      if (!ensureEventEnabled('message_delivered', respond)) {
        return;
      }
      if (!messageId || !conversationId) {
        logger.warn(`[Chat] User ${userId} attempted message_delivered with missing data`);
        respond({ status: 'error', message: 'messageId and conversationId are required' });
        return;
      }

      try {
        const receipt = await deliveryReceiptHandler.markAsDelivered(userId, messageId, conversationId);

        // Broadcast delivery receipt to conversation (sender will see it)
        deliveryReceiptHandler.broadcastDeliveryReceipt(conversationId, tenantId, receipt, userId);

        respond({ status: 'ok', message: 'Delivery receipt recorded', receipt });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark message as delivered: ${error.message}`);
        respond({ status: 'error', message: 'Failed to mark message as delivered' });
      }
    });

    // Batch delivery receipt
    socket.on('messages_delivered', async ({ messageIds, conversationId }: { messageIds: string[]; conversationId: string }, callback?: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'messages_delivered', callback);
      if (!ensureEventEnabled('messages_delivered', respond)) {
        return;
      }
      if (!messageIds || !conversationId || messageIds.length === 0) {
        logger.warn(`[Chat] User ${userId} attempted messages_delivered with missing data`);
        respond({ status: 'error', message: 'messageIds and conversationId are required' });
        return;
      }

      try {
        const receipts = await deliveryReceiptHandler.markBatchAsDelivered(userId, messageIds, conversationId);

        // Broadcast the last receipt (most recent delivery)
        if (receipts.length > 0) {
          const lastReceipt = receipts[receipts.length - 1];
          deliveryReceiptHandler.broadcastDeliveryReceipt(conversationId, tenantId, lastReceipt, userId);
        }

        respond({ status: 'ok', message: 'Delivery receipts recorded', count: receipts.length });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark messages as delivered: ${error.message}`);
        respond({ status: 'error', message: 'Failed to mark messages as delivered' });
      }
    });

    // Query delivery status
    socket.on('delivery_status', async ({ messageId }: { messageId: string }, callback: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'delivery_status', callback);
      if (!ensureEventEnabled('delivery_status', respond)) {
        return;
      }
      if (!messageId) {
        return respond({ status: 'error', message: 'messageId is required' });
      }

      try {
        const deliveryStatus = await deliveryReceiptHandler.getDeliveryStatus(messageId);

        if (!deliveryStatus) {
          return respond({ status: 'error', message: 'Message not found' });
        }

        respond({
          status: 'ok',
          message: 'Delivery status loaded',
          delivery_status: deliveryStatus,
        });
      } catch (error: any) {
        logger.error(`[Chat] Failed to query delivery status: ${error.message}`);
        respond({ status: 'error', message: 'Failed to query delivery status' });
      }
    });

    // Typing indicators
    socket.on('typing_start', async ({ conversationId }: { conversationId: string }, callback?: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'typing_start', callback);
      if (!ensureEventEnabled('typing_start', respond)) {
        return;
      }
      if (!conversationId) {
        logger.warn(`[Chat] User ${userId} attempted typing_start with no conversationId`);
        respond({ status: 'error', message: 'conversationId is required' });
        return;
      }

      const roomName = getConversationRoomName(tenantId, conversationId, projectId);

      // Check if user is in the room
      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} attempted typing_start in room ${roomName} without being a member`);
        respond({ status: 'error', message: 'Not a member of this room' });
        return;
      }

      // Check rate limit for typing indicators
      const typingLimit = await rateLimiter.checkTypingLimit(userId, tenantId);
      if (!typingLimit.allowed) {
        logger.debug(`[Chat] User ${userId} exceeded typing rate limit`);
        respond({ status: 'error', message: 'Too many typing updates', retry_after_ms: typingLimit.retry_after_ms });
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
      respond({ status: 'ok', message: 'Typing started', conversation_id: conversationId });
    });

    socket.on('typing_stop', async ({ conversationId }: { conversationId: string }, callback?: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'typing_stop', callback);
      if (!ensureEventEnabled('typing_stop', respond)) {
        return;
      }
      if (!conversationId) {
        logger.warn(`[Chat] User ${userId} attempted typing_stop with no conversationId`);
        respond({ status: 'error', message: 'conversationId is required' });
        return;
      }

      await typingHandler.handleTypingStop(socket, conversationId, userId, tenantId);
      respond({ status: 'ok', message: 'Typing stopped', conversation_id: conversationId });
    });

    // Query current typing users
    socket.on('typing_query', async ({ conversationId }: { conversationId: string }, callback: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'typing_query', callback);
      if (!ensureEventEnabled('typing_query', respond)) {
        return;
      }
      if (!conversationId) {
        return respond({ status: 'error', message: 'conversationId is required' });
      }

      try {
        const typingUsers = await typingHandler.getTypingUsers(conversationId);
        // Filter out the requesting user
        const filteredUsers = typingUsers.filter(u => u.user_id !== userId);

        respond({
          status: 'ok',
          message: 'Typing users loaded',
          users: filteredUsers,
          count: filteredUsers.length,
        });
      } catch (error: any) {
        logger.error(`[Chat] Failed to query typing users: ${error.message}`);
        respond({ status: 'error', message: 'Failed to query typing users' });
      }
    });

    // Read receipts
    socket.on('message_read', async ({ messageId, conversationId }: { messageId: string; conversationId: string }, callback?: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'message_read', callback);
      if (!ensureEventEnabled('message_read', respond)) {
        return;
      }
      if (!messageId || !conversationId) {
        logger.warn(`[Chat] User ${userId} attempted message_read with missing data`);
        respond({ status: 'error', message: 'messageId and conversationId are required' });
        return;
      }

      const roomName = getConversationRoomName(tenantId, conversationId, projectId);

      // Check if user is in the room
      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} attempted message_read in room ${roomName} without being a member`);
        respond({ status: 'error', message: 'Not a member of this room' });
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

        respond({ status: 'ok', message: 'Read receipt recorded', receipt });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark message as read: ${error.message}`);
        respond({ status: 'error', message: 'Failed to mark message as read' });
      }
    });

    socket.on('messages_read', async ({ messageIds, conversationId }: { messageIds: string[]; conversationId: string }, callback?: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'messages_read', callback);
      if (!ensureEventEnabled('messages_read', respond)) {
        return;
      }
      if (!messageIds || !conversationId || messageIds.length === 0) {
        logger.warn(`[Chat] User ${userId} attempted messages_read with missing data`);
        respond({ status: 'error', message: 'messageIds and conversationId are required' });
        return;
      }

      const roomName = getConversationRoomName(tenantId, conversationId, projectId);

      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} attempted messages_read in room ${roomName} without being a member`);
        respond({ status: 'error', message: 'Not a member of this room' });
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

        respond({ status: 'ok', message: 'Read receipts recorded', count: receipts.length });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark messages as read: ${error.message}`);
        respond({ status: 'error', message: 'Failed to mark messages as read' });
      }
    });

    socket.on('conversation_read', async ({ conversationId, upToMessageId }: { conversationId: string; upToMessageId: string }, callback?: (response: any) => void) => {
      const respond = createSocketEventResponder(socket, 'chat', 'conversation_read', callback);
      if (!ensureEventEnabled('conversation_read', respond)) {
        return;
      }
      if (!conversationId || !upToMessageId) {
        logger.warn(`[Chat] User ${userId} attempted conversation_read with missing data`);
        respond({ status: 'error', message: 'conversationId and upToMessageId are required' });
        return;
      }

      const roomName = getConversationRoomName(tenantId, conversationId, projectId);

      if (!socket.rooms.has(roomName)) {
        logger.warn(`[Chat] User ${userId} attempted conversation_read in room ${roomName} without being a member`);
        respond({ status: 'error', message: 'Not a member of this room' });
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

        respond({ status: 'ok', message: 'Conversation marked as read' });
      } catch (error: any) {
        logger.error(`[Chat] Failed to mark conversation as read: ${error.message}`);
        respond({ status: 'error', message: 'Failed to mark conversation as read' });
      }
    });

    // Query unread counts
    socket.on('unread_query', async (
      payloadOrCallback?: Record<string, any> | ((response: any) => void),
      maybeCallback?: (response: any) => void
    ) => {
      const callback = typeof payloadOrCallback === 'function'
        ? payloadOrCallback
        : maybeCallback;
      const respond = createSocketEventResponder(socket, 'chat', 'unread_query', callback);
      if (!ensureEventEnabled('unread_query', respond)) {
        return;
      }

      try {
        const allUnread = await unreadCounter.getAllUnreadCounts(userId);
        const totalUnread = await unreadCounter.getTotalUnread(userId);

        const unreadMap: Record<string, number> = {};
        for (const [conversationId, count] of allUnread.entries()) {
          unreadMap[conversationId] = count;
        }

        if (callback) {
          respond({
            status: 'ok',
            message: 'Unread counts loaded',
            unread: unreadMap,
            total: totalUnread,
          });
        }
      } catch (error: any) {
        logger.error(`[Chat] Failed to query unread counts: ${error.message}`);
        respond({ status: 'error', message: 'Failed to query unread counts' });
      }
    });

    // --- Moderation events (wired to RoomModeration) ---
    socket.on('moderate:kick', async (
      { conversationId, targetUserId, reason }: { conversationId: string; targetUserId: string; reason?: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'moderate:kick', callback);
      if (!ensureEventEnabled('moderate:kick', respond)) {
        return;
      }
      try {
        await roomModeration.kickUser(userId, targetUserId, conversationId, tenantId, reason);
      const roomName = getConversationRoomName(tenantId, conversationId, projectId);
        chat.to(roomName).emit('moderation:kicked', {
          target_user_id: targetUserId,
          moderator_id: userId,
          conversation_id: conversationId,
          reason,
        });
        respond({ status: 'ok', message: 'User kicked', target_user_id: targetUserId });
      } catch (error: any) {
        respond({ status: 'error', message: error.message });
      }
    });

    socket.on('moderate:ban', async (
      { conversationId, targetUserId, durationSeconds, reason }: { conversationId: string; targetUserId: string; durationSeconds?: number; reason?: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'moderate:ban', callback);
      if (!ensureEventEnabled('moderate:ban', respond)) {
        return;
      }
      try {
        await roomModeration.banUser(userId, targetUserId, conversationId, tenantId, durationSeconds, reason);
      const roomName = getConversationRoomName(tenantId, conversationId, projectId);
        chat.to(roomName).emit('moderation:banned', {
          target_user_id: targetUserId,
          moderator_id: userId,
          conversation_id: conversationId,
          duration_seconds: durationSeconds,
          reason,
        });
        respond({ status: 'ok', message: 'User banned', target_user_id: targetUserId });
      } catch (error: any) {
        respond({ status: 'error', message: error.message });
      }
    });

    socket.on('moderate:unban', async (
      { conversationId, targetUserId, reason }: { conversationId: string; targetUserId: string; reason?: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'moderate:unban', callback);
      if (!ensureEventEnabled('moderate:unban', respond)) {
        return;
      }
      try {
        await roomModeration.unbanUser(userId, targetUserId, conversationId, tenantId, reason);
        respond({ status: 'ok', message: 'User unbanned', target_user_id: targetUserId });
      } catch (error: any) {
        respond({ status: 'error', message: error.message });
      }
    });

    socket.on('moderate:mute', async (
      { conversationId, targetUserId, durationSeconds, reason }: { conversationId: string; targetUserId: string; durationSeconds?: number; reason?: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'moderate:mute', callback);
      if (!ensureEventEnabled('moderate:mute', respond)) {
        return;
      }
      try {
        await roomModeration.muteUser(userId, targetUserId, conversationId, tenantId, durationSeconds, reason);
        const roomName = getConversationRoomName(tenantId, conversationId, projectId);
        chat.to(roomName).emit('moderation:muted', {
          target_user_id: targetUserId,
          moderator_id: userId,
          conversation_id: conversationId,
          duration_seconds: durationSeconds,
          reason,
        });
        respond({ status: 'ok', message: 'User muted', target_user_id: targetUserId });
      } catch (error: any) {
        respond({ status: 'error', message: error.message });
      }
    });

    socket.on('moderate:unmute', async (
      { conversationId, targetUserId, reason }: { conversationId: string; targetUserId: string; reason?: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'moderate:unmute', callback);
      if (!ensureEventEnabled('moderate:unmute', respond)) {
        return;
      }
      try {
        await roomModeration.unmuteUser(userId, targetUserId, conversationId, tenantId, reason);
        const roomName = getConversationRoomName(tenantId, conversationId, projectId);
        chat.to(roomName).emit('moderation:unmuted', {
          target_user_id: targetUserId,
          moderator_id: userId,
          conversation_id: conversationId,
          reason,
        });
        respond({ status: 'ok', message: 'User unmuted', target_user_id: targetUserId });
      } catch (error: any) {
        respond({ status: 'error', message: error.message });
      }
    });

    // ── RT-SOCK-001: Advanced Chat Interaction Events ──

    socket.on('message_react', async (
      { conversationId, messageId, reaction, action: reactAction }: { conversationId: string; messageId: string; reaction: string; action: 'add' | 'remove' },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'message_react', callback);
      if (!ensureEventEnabled('message_react', respond)) return;
      if (!conversationId || !messageId || !reaction) {
        return respond({ status: 'error', message: 'conversationId, messageId, and reaction are required' });
      }
      const roomName = getConversationRoomName(tenantId, conversationId, projectId);
      if (!socket.rooms.has(roomName)) {
        return respond({ status: 'error', message: 'Not a member of this room' });
      }
      const messageLimit = await rateLimiter.checkMessageLimit(userId, conversationId, tenantId);
      if (!messageLimit.allowed) {
        return respond({ status: 'error', message: 'Too many requests. Please slow down.', retry_after_ms: messageLimit.retry_after_ms });
      }
      try {
        const reactionId = `react_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        chat.to(roomName).emit('reaction_update', {
          reaction_id: reactionId,
          message_id: messageId,
          conversation_id: conversationId,
          user_id: userId,
          reaction,
          action: reactAction || 'add',
          timestamp: new Date().toISOString(),
        });
        if (kafkaProducer.isConnected()) {
          await kafkaProducer.publishMessage({
            message_id: reactionId,
            conversation_id: conversationId,
            tenant_id: tenantId,
            project_id: projectId,
            sender_id: userId,
            content: { type: 'text', text: `reaction:${reactAction || 'add'}:${reaction}` },
            timestamp: new Date(),
            metadata: { socket_id: socket.id, correlation_id: reactionId },
          });
        }
        respond({ status: 'ok', message: 'Reaction recorded', reaction_id: reactionId, action: reactAction || 'add' });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to process reaction: ${error.message}` });
      }
    });

    socket.on('message_pin', async (
      { conversationId, messageId, pinned }: { conversationId: string; messageId: string; pinned: boolean },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'message_pin', callback);
      if (!ensureEventEnabled('message_pin', respond)) return;
      if (!conversationId || !messageId) {
        return respond({ status: 'error', message: 'conversationId and messageId are required' });
      }
      const roomName = getConversationRoomName(tenantId, conversationId, projectId);
      if (!socket.rooms.has(roomName)) {
        return respond({ status: 'error', message: 'Not a member of this room' });
      }
      try {
        chat.to(roomName).emit('message_pinned', {
          message_id: messageId,
          conversation_id: conversationId,
          pinned: pinned !== false,
          pinned_by: userId,
          timestamp: new Date().toISOString(),
        });
        respond({ status: 'ok', message: pinned !== false ? 'Message pinned' : 'Message unpinned', message_id: messageId });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to pin message: ${error.message}` });
      }
    });

    socket.on('message_save', async (
      { conversationId, messageId, saved }: { conversationId: string; messageId: string; saved?: boolean },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'message_save', callback);
      if (!ensureEventEnabled('message_save', respond)) return;
      if (!conversationId || !messageId) {
        return respond({ status: 'error', message: 'conversationId and messageId are required' });
      }
      const roomName = getConversationRoomName(tenantId, conversationId, projectId);
      if (!socket.rooms.has(roomName)) {
        return respond({ status: 'error', message: 'Not a member of this room' });
      }
      try {
        const saveKey = `saved:${tenantId}:${userId}:${messageId}`;
        if (saved !== false) {
          await redisClient.set(saveKey, JSON.stringify({ conversation_id: conversationId, saved_at: new Date().toISOString() }));
        } else {
          await redisClient.del(saveKey);
        }
        respond({ status: 'ok', message: saved !== false ? 'Message saved' : 'Message unsaved', message_id: messageId });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to save message: ${error.message}` });
      }
    });

    socket.on('message_forward', async (
      { sourceConversationId, targetConversationId, messageId }: { sourceConversationId: string; targetConversationId: string; messageId: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'message_forward', callback);
      if (!ensureEventEnabled('message_forward', respond)) return;
      if (!sourceConversationId || !targetConversationId || !messageId) {
        return respond({ status: 'error', message: 'sourceConversationId, targetConversationId, and messageId are required' });
      }
      const sourceRoom = getConversationRoomName(tenantId, sourceConversationId, projectId);
      if (!socket.rooms.has(sourceRoom)) {
        return respond({ status: 'error', message: 'Not a member of the source room' });
      }
      const targetAuth = await roomAuthorizer.canSendMessage(userId, targetConversationId, tenantId, projectId);
      if (!targetAuth.authorized) {
        return respond({ status: 'error', code: targetAuth.code || 'FORBIDDEN', message: targetAuth.reason || 'Not authorized to send to target conversation' });
      }
      try {
        const forwardId = `fwd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const targetRoom = getConversationRoomName(tenantId, targetConversationId, projectId);
        chat.to(targetRoom).emit('message', {
          id: forwardId,
          senderId: userId,
          senderName: displayName,
          tenantId,
          conversationId: targetConversationId,
          content: `[Forwarded message from ${sourceConversationId}]`,
          forwarded_from: { conversation_id: sourceConversationId, message_id: messageId },
          timestamp: new Date().toISOString(),
        });
        if (kafkaProducer.isConnected()) {
          await kafkaProducer.publishMessage({
            message_id: forwardId,
            conversation_id: targetConversationId,
            tenant_id: tenantId,
            project_id: projectId,
            sender_id: userId,
            content: { type: 'text', text: `[Forwarded from ${sourceConversationId}]` },
            timestamp: new Date(),
            metadata: { socket_id: socket.id, correlation_id: `fwd:${messageId}:${forwardId}` },
          });
        }
        respond({ status: 'ok', message: 'Message forwarded', forward_id: forwardId, target_conversation_id: targetConversationId });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to forward message: ${error.message}` });
      }
    });

    socket.on('message_archive', async (
      { conversationId, messageId }: { conversationId: string; messageId: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'message_archive', callback);
      if (!ensureEventEnabled('message_archive', respond)) return;
      if (!conversationId || !messageId) {
        return respond({ status: 'error', message: 'conversationId and messageId are required' });
      }
      const modAuth = await roomAuthorizer.canModerate(userId, conversationId, tenantId, projectId);
      if (!modAuth.authorized) {
        return respond({ status: 'error', code: 'FORBIDDEN', message: 'Moderator role required to archive messages' });
      }
      try {
        const roomName = getConversationRoomName(tenantId, conversationId, projectId);
        chat.to(roomName).emit('message_archived', {
          message_id: messageId,
          conversation_id: conversationId,
          archived_by: userId,
          timestamp: new Date().toISOString(),
        });
        respond({ status: 'ok', message: 'Message archived', message_id: messageId });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to archive message: ${error.message}` });
      }
    });

    socket.on('thread_reply', async (
      { conversationId, parentMessageId, messageContent }: { conversationId: string; parentMessageId: string; messageContent: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'thread_reply', callback);
      if (!ensureEventEnabled('thread_reply', respond)) return;
      if (!conversationId || !parentMessageId || !messageContent) {
        return respond({ status: 'error', message: 'conversationId, parentMessageId, and messageContent are required' });
      }
      const roomName = getConversationRoomName(tenantId, conversationId, projectId);
      if (!socket.rooms.has(roomName)) {
        return respond({ status: 'error', message: 'Not a member of this room' });
      }
      const sendAuth = await roomAuthorizer.canSendMessage(userId, conversationId, tenantId, projectId);
      if (!sendAuth.authorized) {
        return respond({ status: 'error', code: sendAuth.code || 'FORBIDDEN', message: sendAuth.reason || 'Not authorized to send messages' });
      }
      const spamCheck = await spamDetector.detectSpam(userId, messageContent, tenantId);
      if (spamCheck.is_spam) {
        return respond({ status: 'error', message: 'Message rejected: spam detected', reasons: spamCheck.reasons });
      }
      try {
        const replyId = `reply_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const timestamp = new Date();
        chat.to(roomName).emit('thread_message', {
          id: replyId,
          parent_message_id: parentMessageId,
          senderId: userId,
          senderName: displayName,
          tenantId,
          conversationId,
          content: messageContent,
          timestamp: timestamp.toISOString(),
        });
        if (kafkaProducer.isConnected()) {
          await kafkaProducer.publishMessage({
            message_id: replyId,
            conversation_id: conversationId,
            tenant_id: tenantId,
            project_id: projectId,
            sender_id: userId,
            content: { type: 'text', text: messageContent },
            timestamp,
            metadata: { socket_id: socket.id, correlation_id: `thread:${parentMessageId}:${replyId}` },
          });
        }
        respond({ status: 'ok', message: 'Thread reply sent', reply_id: replyId, parent_message_id: parentMessageId });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to send thread reply: ${error.message}` });
      }
    });

    // ── Group Lifecycle Events ──

    socket.on('group_create', async (
      { name, memberIds, settings }: { name: string; memberIds?: string[]; settings?: Record<string, any> },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'group_create', callback);
      if (!ensureEventEnabled('group_create', respond)) return;
      if (!name) {
        return respond({ status: 'error', message: 'Group name is required' });
      }
      try {
        const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const participants = [{ user_id: userId, role: 'owner' }];
        if (memberIds && Array.isArray(memberIds)) {
          for (const mId of memberIds) {
            participants.push({ user_id: mId, role: 'member' });
          }
        }
        const db = mongoClient.db('caas_platform');
        await db.collection('conversations').insertOne({
          conversation_id: groupId,
          tenant_id: tenantId,
          project_id: projectId,
          type: 'group',
          name,
          participants,
          settings: settings || {},
          created_at: new Date(),
          updated_at: new Date(),
          created_by: userId,
        });
        respond({ status: 'ok', message: 'Group created', group_id: groupId, name, participants_count: participants.length });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to create group: ${error.message}` });
      }
    });

    socket.on('group_settings_update', async (
      { conversationId, settings }: { conversationId: string; settings: Record<string, any> },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'group_settings_update', callback);
      if (!ensureEventEnabled('group_settings_update', respond)) return;
      if (!conversationId || !settings) {
        return respond({ status: 'error', message: 'conversationId and settings are required' });
      }
      const modAuth = await roomAuthorizer.canModerate(userId, conversationId, tenantId, projectId);
      if (!modAuth.authorized) {
        return respond({ status: 'error', code: 'FORBIDDEN', message: 'Moderator role required to update group settings' });
      }
      try {
        const db = mongoClient.db('caas_platform');
        await db.collection('conversations').updateOne(
          { conversation_id: conversationId, tenant_id: tenantId },
          { $set: { settings, updated_at: new Date() } }
        );
        const roomName = getConversationRoomName(tenantId, conversationId, projectId);
        chat.to(roomName).emit('group_settings_changed', {
          conversation_id: conversationId,
          settings,
          updated_by: userId,
          timestamp: new Date().toISOString(),
        });
        respond({ status: 'ok', message: 'Group settings updated', conversation_id: conversationId });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to update group settings: ${error.message}` });
      }
    });

    socket.on('group_member_role_update', async (
      { conversationId, targetUserId, role }: { conversationId: string; targetUserId: string; role: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'group_member_role_update', callback);
      if (!ensureEventEnabled('group_member_role_update', respond)) return;
      if (!conversationId || !targetUserId || !role) {
        return respond({ status: 'error', message: 'conversationId, targetUserId, and role are required' });
      }
      const modAuth = await roomAuthorizer.canModerate(userId, conversationId, tenantId, projectId);
      if (!modAuth.authorized) {
        return respond({ status: 'error', code: 'FORBIDDEN', message: 'Moderator role required to update member roles' });
      }
      try {
        const db = mongoClient.db('caas_platform');
        await db.collection('conversations').updateOne(
          { conversation_id: conversationId, tenant_id: tenantId, 'participants.user_id': targetUserId },
          { $set: { 'participants.$.role': role, updated_at: new Date() } }
        );
        const roomName = getConversationRoomName(tenantId, conversationId, projectId);
        chat.to(roomName).emit('member_role_changed', {
          conversation_id: conversationId,
          target_user_id: targetUserId,
          new_role: role,
          updated_by: userId,
          timestamp: new Date().toISOString(),
        });
        await roomAuthorizer.invalidateCache(targetUserId, conversationId, tenantId, projectId);
        respond({ status: 'ok', message: 'Member role updated', target_user_id: targetUserId, role });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to update member role: ${error.message}` });
      }
    });

    socket.on('group_invite_link', async (
      { conversationId, action: linkAction }: { conversationId: string; action: 'create' | 'revoke' },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'group_invite_link', callback);
      if (!ensureEventEnabled('group_invite_link', respond)) return;
      if (!conversationId) {
        return respond({ status: 'error', message: 'conversationId is required' });
      }
      const modAuth = await roomAuthorizer.canModerate(userId, conversationId, tenantId, projectId);
      if (!modAuth.authorized) {
        return respond({ status: 'error', code: 'FORBIDDEN', message: 'Moderator role required to manage invite links' });
      }
      try {
        const linkKey = `invite:${tenantId}:${conversationId}`;
        if (linkAction === 'revoke') {
          await redisClient.del(linkKey);
          respond({ status: 'ok', message: 'Invite link revoked', conversation_id: conversationId });
        } else {
          const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          await redisClient.set(linkKey, JSON.stringify({ token, created_by: userId, created_at: new Date().toISOString() }));
          respond({ status: 'ok', message: 'Invite link created', conversation_id: conversationId, invite_token: token });
        }
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to manage invite link: ${error.message}` });
      }
    });

    // ── Planner-trigger Events ──

    socket.on('planner_task_create', async (
      { conversationId, title, description, assigneeId }: { conversationId: string; title: string; description?: string; assigneeId?: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'planner_task_create', callback);
      if (!ensureEventEnabled('planner_task_create', respond)) return;
      if (!conversationId || !title) {
        return respond({ status: 'error', message: 'conversationId and title are required' });
      }
      const roomName = getConversationRoomName(tenantId, conversationId, projectId);
      if (!socket.rooms.has(roomName)) {
        return respond({ status: 'error', message: 'Not a member of this room' });
      }
      try {
        const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const task = {
          task_id: taskId,
          conversation_id: conversationId,
          tenant_id: tenantId,
          project_id: projectId,
          title,
          description: description || '',
          status: 'open',
          created_by: userId,
          assignee_id: assigneeId || null,
          created_at: new Date().toISOString(),
        };
        const taskKey = `task:${tenantId}:${taskId}`;
        await redisClient.set(taskKey, JSON.stringify(task));
        chat.to(roomName).emit('planner_task_created', task);
        respond({ status: 'ok', message: 'Task created', task_id: taskId });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to create task: ${error.message}` });
      }
    });

    socket.on('planner_task_update', async (
      { taskId, conversationId, status: taskStatus, assigneeId, title }: { taskId: string; conversationId: string; status?: string; assigneeId?: string; title?: string },
      callback: (response: any) => void
    ) => {
      const respond = createSocketEventResponder(socket, 'chat', 'planner_task_update', callback);
      if (!ensureEventEnabled('planner_task_update', respond)) return;
      if (!taskId || !conversationId) {
        return respond({ status: 'error', message: 'taskId and conversationId are required' });
      }
      const roomName = getConversationRoomName(tenantId, conversationId, projectId);
      if (!socket.rooms.has(roomName)) {
        return respond({ status: 'error', message: 'Not a member of this room' });
      }
      try {
        const taskKey = `task:${tenantId}:${taskId}`;
        const existing = await redisClient.get(taskKey);
        if (!existing) {
          return respond({ status: 'error', message: 'Task not found' });
        }
        const task = JSON.parse(existing);
        if (taskStatus) task.status = taskStatus;
        if (assigneeId !== undefined) task.assignee_id = assigneeId;
        if (title) task.title = title;
        task.updated_at = new Date().toISOString();
        task.updated_by = userId;
        await redisClient.set(taskKey, JSON.stringify(task));
        chat.to(roomName).emit('planner_task_updated', task);
        respond({ status: 'ok', message: 'Task updated', task_id: taskId, task_status: task.status });
      } catch (error: any) {
        respond({ status: 'error', message: `Failed to update task: ${error.message}` });
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
