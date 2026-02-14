/**
 * Authorization Integration Tests
 * 
 * Tests for authorization enforcement including:
 * - Permission matrix checks
 * - Conversation membership validation
 * - Cross-tenant access blocking
 * - Role-based access control
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoClient } from 'mongodb';
import Redis from 'ioredis';
import { authzEnforcer, AuthzRequest } from '../../src/middleware/authorization';

describe('Authorization Integration Tests', () => {
  let mongoClient: MongoClient;
  let redisClient: Redis;
  const testTenantId = 'test-tenant-123';
  const testUserId = 'test-user-456';
  const testConversationId = 'test-conv-789';

  beforeAll(async () => {
    // Connect to test databases
    mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/caas_test');
    await mongoClient.connect();

    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    // Initialize authz enforcer
    authzEnforcer.setMongoClient(mongoClient);
    authzEnforcer.setRedisClient(redisClient);
  });

  afterAll(async () => {
    await mongoClient?.close();
    await redisClient?.quit();
  });

  beforeEach(async () => {
    // Clean up test data
    const db = mongoClient.db('caas_platform');
    await db.collection('conversations').deleteMany({ conversation_id: testConversationId });
    await redisClient.flushdb();
  });

  describe('Cross-tenant access', () => {
    it('should deny access when subject and resource tenant IDs differ', async () => {
      const request: AuthzRequest = {
        subject: {
          user_id: testUserId,
          tenant_id: 'tenant-a',
          roles: ['user'],
        },
        resource: {
          type: 'conversation',
          id: testConversationId,
          tenant_id: 'tenant-b',
        },
        action: 'read',
        environment: {
          ip_address: '127.0.0.1',
          time: new Date(),
        },
      };

      const decision = await authzEnforcer.authorize(request);

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Cross-tenant access denied');
    });
  });

  describe('Platform admin access', () => {
    it('should allow platform admin full access', async () => {
      const request: AuthzRequest = {
        subject: {
          user_id: testUserId,
          tenant_id: testTenantId,
          roles: ['platform_admin'],
        },
        resource: {
          type: 'conversation',
          id: testConversationId,
          tenant_id: testTenantId,
        },
        action: 'delete',
        environment: {
          ip_address: '127.0.0.1',
          time: new Date(),
        },
      };

      const decision = await authzEnforcer.authorize(request);

      expect(decision.allowed).toBe(true);
      expect(decision.reason).toContain('Platform admin');
    });
  });

  describe('Tenant admin access', () => {
    it('should allow tenant admin access within their tenant', async () => {
      const request: AuthzRequest = {
        subject: {
          user_id: testUserId,
          tenant_id: testTenantId,
          roles: ['tenant_admin'],
        },
        resource: {
          type: 'conversation',
          id: testConversationId,
          tenant_id: testTenantId,
        },
        action: 'read',
        environment: {
          ip_address: '127.0.0.1',
          time: new Date(),
        },
      };

      const decision = await authzEnforcer.authorize(request);

      expect(decision.allowed).toBe(true);
      expect(decision.reason).toContain('Tenant admin');
    });
  });

  describe('Conversation membership', () => {
    it('should deny non-member access to conversation', async () => {
      // Create conversation without the test user as participant
      const db = mongoClient.db('caas_platform');
      await db.collection('conversations').insertOne({
        conversation_id: testConversationId,
        tenant_id: testTenantId,
        participants: [
          { user_id: 'other-user', role: 'member' },
        ],
        created_at: new Date(),
      });

      const request: AuthzRequest = {
        subject: {
          user_id: testUserId,
          tenant_id: testTenantId,
          roles: ['user'],
        },
        resource: {
          type: 'conversation',
          id: testConversationId,
          tenant_id: testTenantId,
        },
        action: 'read',
        environment: {
          ip_address: '127.0.0.1',
          time: new Date(),
        },
      };

      const decision = await authzEnforcer.authorize(request);

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('membership required');
    });

    it('should allow member access to conversation', async () => {
      // Create conversation with test user as participant
      const db = mongoClient.db('caas_platform');
      await db.collection('conversations').insertOne({
        conversation_id: testConversationId,
        tenant_id: testTenantId,
        participants: [
          { user_id: testUserId, role: 'member' },
        ],
        created_at: new Date(),
      });

      const request: AuthzRequest = {
        subject: {
          user_id: testUserId,
          tenant_id: testTenantId,
          roles: ['user'],
        },
        resource: {
          type: 'conversation',
          id: testConversationId,
          tenant_id: testTenantId,
        },
        action: 'read',
        environment: {
          ip_address: '127.0.0.1',
          time: new Date(),
        },
      };

      const decision = await authzEnforcer.authorize(request);

      expect(decision.allowed).toBe(true);
    });

    it('should use cached membership check on second request', async () => {
      // Create conversation
      const db = mongoClient.db('caas_platform');
      await db.collection('conversations').insertOne({
        conversation_id: testConversationId,
        tenant_id: testTenantId,
        participants: [
          { user_id: testUserId, role: 'member' },
        ],
        created_at: new Date(),
      });

      const request: AuthzRequest = {
        subject: {
          user_id: testUserId,
          tenant_id: testTenantId,
          roles: ['user'],
        },
        resource: {
          type: 'conversation',
          id: testConversationId,
          tenant_id: testTenantId,
        },
        action: 'read',
        environment: {
          ip_address: '127.0.0.1',
          time: new Date(),
        },
      };

      // First request - should hit database
      const decision1 = await authzEnforcer.authorize(request);
      expect(decision1.allowed).toBe(true);

      // Second request - should use cache
      const decision2 = await authzEnforcer.authorize(request);
      expect(decision2.allowed).toBe(true);
    });
  });

  describe('Message permissions', () => {
    it('should require membership to send message', async () => {
      const request: AuthzRequest = {
        subject: {
          user_id: testUserId,
          tenant_id: testTenantId,
          roles: ['user'],
        },
        resource: {
          type: 'message',
          id: 'msg-123',
          tenant_id: testTenantId,
        },
        action: 'create',
        environment: {
          ip_address: '127.0.0.1',
          time: new Date(),
        },
      };

      const decision = await authzEnforcer.authorize(request);

      // Should be denied because user is not a member of any conversation
      expect(decision.allowed).toBe(false);
    });
  });

  describe('Ownership checks', () => {
    it('should require ownership for message update', async () => {
      // Create conversation with user as member
      const db = mongoClient.db('caas_platform');
      await db.collection('conversations').insertOne({
        conversation_id: testConversationId,
        tenant_id: testTenantId,
        participants: [
          { user_id: testUserId, role: 'member' },
        ],
        created_at: new Date(),
      });

      const request: AuthzRequest = {
        subject: {
          user_id: testUserId,
          tenant_id: testTenantId,
          roles: ['user'],
        },
        resource: {
          type: 'message',
          id: 'msg-123',
          tenant_id: testTenantId,
          owner_id: 'different-user', // Not the test user
        },
        action: 'update',
        environment: {
          ip_address: '127.0.0.1',
          time: new Date(),
        },
      };

      const decision = await authzEnforcer.authorize(request);

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('ownership');
    });
  });
});
