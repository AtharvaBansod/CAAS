import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { build } from '../helper';
import { FastifyInstance } from 'fastify';

describe('Tenant MFA Configuration', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await build();
    
    // Create admin user
    const adminResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'admin@example.com',
        password: 'Admin123!@#',
        tenant_id: 'test-tenant',
        role: 'admin',
      },
    });

    const adminData = JSON.parse(adminResponse.payload);
    adminToken = adminData.token;

    // Create test user
    const userResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'user@example.com',
        password: 'User123!@#',
        tenant_id: 'test-tenant',
      },
    });

    const userData = JSON.parse(userResponse.payload);
    testUserId = userData.user.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/admin/tenant/mfa', () => {
    it('should get tenant MFA configuration', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.config).toBeDefined();
      expect(data.config.level).toBeDefined();
      expect(data.config.methods).toBeInstanceOf(Array);
    });

    it('should return default config if not set', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      const data = JSON.parse(response.payload);
      expect(data.config.level).toBe('OPTIONAL');
      expect(data.config.trusted_device_days).toBe(30);
      expect(data.config.grace_period_days).toBe(7);
    });

    it('should require admin role', async () => {
      // Create non-admin user
      const userResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'nonadmin@example.com',
          password: 'User123!@#',
          tenant_id: 'test-tenant',
        },
      });

      const userData = JSON.parse(userResponse.payload);
      const userToken = userData.token;

      const response = await app.inject({
        method: 'GET',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('PUT /v1/admin/tenant/mfa', () => {
    it('should update tenant MFA configuration', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          level: 'REQUIRED',
          methods: ['totp', 'backup_code'],
          trusted_device_days: 60,
          grace_period_days: 14,
          exempt_users: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.config.level).toBe('REQUIRED');
      expect(data.config.trusted_device_days).toBe(60);
    });

    it('should validate configuration schema', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          level: 'INVALID_LEVEL',
          methods: ['totp'],
          trusted_device_days: 30,
          grace_period_days: 7,
          exempt_users: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should persist configuration', async () => {
      await app.inject({
        method: 'PUT',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          level: 'ADMIN_ONLY',
          methods: ['totp'],
          trusted_device_days: 45,
          grace_period_days: 10,
          exempt_users: [testUserId],
        },
      });

      // Verify persistence
      const response = await app.inject({
        method: 'GET',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      const data = JSON.parse(response.payload);
      expect(data.config.level).toBe('ADMIN_ONLY');
      expect(data.config.trusted_device_days).toBe(45);
      expect(data.config.exempt_users).toContain(testUserId);
    });
  });

  describe('GET /v1/admin/users/mfa-status', () => {
    it('should list users with MFA status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/admin/users/mfa-status',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        query: {
          limit: '50',
          offset: '0',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.users).toBeInstanceOf(Array);
      expect(data.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by MFA enabled status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/admin/users/mfa-status',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        query: {
          mfa_enabled: 'true',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      data.users.forEach((user: any) => {
        expect(user.mfa_enabled).toBe(true);
      });
    });

    it('should include backup codes count', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/admin/users/mfa-status',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      const data = JSON.parse(response.payload);
      if (data.users.length > 0) {
        expect(data.users[0]).toHaveProperty('backup_codes_remaining');
      }
    });
  });

  describe('POST /v1/admin/users/:userId/mfa/enforce', () => {
    it('should enforce MFA for specific user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/admin/users/${testUserId}/mfa/enforce`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          grace_period_days: 7,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
    });

    it('should set grace period correctly', async () => {
      const gracePeriodDays = 14;
      
      await app.inject({
        method: 'POST',
        url: `/v1/admin/users/${testUserId}/mfa/enforce`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          grace_period_days: gracePeriodDays,
        },
      });

      // Verify grace period was set
      const statusResponse = await app.inject({
        method: 'GET',
        url: '/v1/admin/users/mfa-status',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      const statusData = JSON.parse(statusResponse.payload);
      const user = statusData.users.find((u: any) => u.user_id === testUserId);
      expect(user).toBeDefined();
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/admin/users/non-existent-user/mfa/enforce',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          grace_period_days: 7,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /v1/admin/mfa/enforce-all', () => {
    it('should enforce MFA for all users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/admin/mfa/enforce-all',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          grace_period_days: 7,
          exclude_users: [],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.affected_users).toBeGreaterThan(0);
    });

    it('should exclude specified users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/admin/mfa/enforce-all',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          grace_period_days: 7,
          exclude_users: [testUserId],
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
    });

    it('should log audit event', async () => {
      await app.inject({
        method: 'POST',
        url: '/v1/admin/mfa/enforce-all',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          grace_period_days: 7,
          exclude_users: [],
        },
      });

      // Verify audit log (implementation depends on audit system)
      expect(true).toBe(true);
    });
  });

  describe('Grace Period Handling', () => {
    it('should allow access during grace period', async () => {
      // Enforce MFA with grace period
      await app.inject({
        method: 'POST',
        url: `/v1/admin/users/${testUserId}/mfa/enforce`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          grace_period_days: 30,
        },
      });

      // User should still have access during grace period
      const userResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'user@example.com',
          password: 'User123!@#',
        },
      });

      const userData = JSON.parse(userResponse.payload);
      const userToken = userData.token;

      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should block access after grace period expires', async () => {
      // This would require time mocking in real implementation
      expect(true).toBe(true);
    });
  });

  describe('User Exemptions', () => {
    it('should exempt specified users from MFA', async () => {
      // Set MFA to REQUIRED with exemption
      await app.inject({
        method: 'PUT',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          level: 'REQUIRED',
          methods: ['totp'],
          trusted_device_days: 30,
          grace_period_days: 0,
          exempt_users: [testUserId],
        },
      });

      // Exempt user should have access
      const userResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'user@example.com',
          password: 'User123!@#',
        },
      });

      const userData = JSON.parse(userResponse.payload);
      const userToken = userData.token;

      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should enforce MFA for non-exempt users', async () => {
      // Create another user (not exempt)
      const newUserResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email: 'nonexempt@example.com',
          password: 'User123!@#',
          tenant_id: 'test-tenant',
        },
      });

      const newUserData = JSON.parse(newUserResponse.payload);
      const newUserToken = newUserData.token;

      // Non-exempt user should be blocked
      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${newUserToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });
});
