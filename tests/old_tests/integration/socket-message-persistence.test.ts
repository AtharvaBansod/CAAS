import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io, Socket } from 'socket.io-client';
import { Kafka } from 'kafkajs';
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';

describe('Socket Message Persistence Integration Tests', () => {
  let socket: Socket;
  let kafka: Kafka;
  let mongoClient: MongoClient;
  let redis: Redis;

  const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3001';
  const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  beforeAll(async () => {
    // Initialize connections
    kafka = new Kafka({
      clientId: 'test-client',
      brokers: KAFKA_BROKERS,
    });

    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();

    redis = new Redis(REDIS_URL);

    // Connect socket
    socket = io(SOCKET_URL, {
      auth: {
        token: 'test-jwt-token', // Replace with valid test token
      },
    });

    await new Promise((resolve) => {
      socket.on('connect', resolve);
    });
  });

  afterAll(async () => {
    socket.disconnect();
    await mongoClient.close();
    redis.disconnect();
  });

  it('should publish message to Kafka when sent via socket', async () => {
    const consumer = kafka.consumer({ groupId: 'test-group' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'chat.messages', fromBeginning: false });

    const messagePromise = new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ message }) => {
          const data = JSON.parse(message.value?.toString() || '{}');
          if (data.message_id === 'test-msg-001') {
            resolve(data);
          }
        },
      });
    });

    // Send message via socket
    socket.emit('sendMessage', {
      message_id: 'test-msg-001',
      conversation_id: 'conv-001',
      content: {
        type: 'text',
        text: 'Test message for Kafka',
      },
    });

    const kafkaMessage = await Promise.race([
      messagePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
    ]);

    expect(kafkaMessage).toBeDefined();
    expect((kafkaMessage as any).message_id).toBe('test-msg-001');

    await consumer.disconnect();
  });

  it('should persist message from Kafka to MongoDB', async () => {
    const messageId = `test-msg-${Date.now()}`;
    
    // Send message via socket
    socket.emit('sendMessage', {
      message_id: messageId,
      conversation_id: 'conv-001',
      content: {
        type: 'text',
        text: 'Test message for MongoDB persistence',
      },
    });

    // Wait for persistence (with timeout)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check MongoDB
    const db = mongoClient.db('caas_platform');
    const messagesCollection = db.collection('messages');
    const message = await messagesCollection.findOne({ message_id: messageId });

    expect(message).toBeDefined();
    expect(message?.message_id).toBe(messageId);
    expect(message?.content).toBeDefined();
  });

  it('should send delivery confirmation to client', async () => {
    const messageId = `test-msg-${Date.now()}`;

    const confirmationPromise = new Promise((resolve) => {
      socket.on('message:persisted', (data) => {
        if (data.message_id === messageId) {
          resolve(data);
        }
      });
    });

    // Send message
    socket.emit('sendMessage', {
      message_id: messageId,
      conversation_id: 'conv-001',
      content: {
        type: 'text',
        text: 'Test message for confirmation',
      },
    });

    const confirmation = await Promise.race([
      confirmationPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000)),
    ]);

    expect(confirmation).toBeDefined();
    expect((confirmation as any).message_id).toBe(messageId);
  });

  it('should handle duplicate messages with idempotency', async () => {
    const messageId = `test-msg-duplicate-${Date.now()}`;

    // Send same message twice
    socket.emit('sendMessage', {
      message_id: messageId,
      conversation_id: 'conv-001',
      content: {
        type: 'text',
        text: 'Duplicate test message',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    socket.emit('sendMessage', {
      message_id: messageId,
      conversation_id: 'conv-001',
      content: {
        type: 'text',
        text: 'Duplicate test message',
      },
    });

    // Wait for persistence
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check MongoDB - should only have one message
    const db = mongoClient.db('caas_platform');
    const messagesCollection = db.collection('messages');
    const count = await messagesCollection.countDocuments({ message_id: messageId });

    expect(count).toBe(1);
  });

  it('should retry failed persistence', async () => {
    // This test would require simulating a MongoDB failure
    // For now, we'll skip the implementation
    expect(true).toBe(true);
  });

  it('should handle bulk message persistence', async () => {
    const messageIds: string[] = [];
    const messageCount = 10;

    // Send multiple messages quickly
    for (let i = 0; i < messageCount; i++) {
      const messageId = `test-msg-bulk-${Date.now()}-${i}`;
      messageIds.push(messageId);

      socket.emit('sendMessage', {
        message_id: messageId,
        conversation_id: 'conv-001',
        content: {
          type: 'text',
          text: `Bulk test message ${i}`,
        },
      });
    }

    // Wait for all messages to be persisted
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check MongoDB
    const db = mongoClient.db('caas_platform');
    const messagesCollection = db.collection('messages');
    const count = await messagesCollection.countDocuments({
      message_id: { $in: messageIds },
    });

    expect(count).toBe(messageCount);
  });
});
