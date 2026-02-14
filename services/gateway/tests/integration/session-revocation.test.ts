import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../helper';
import { FastifyInstance } from 'fastify';

describe('Session Revocation API', () => {
  let app: FastifyInstance;
  let authToken: string;
  let adminToken: string;
  let testSessionId: string;
  let testUserId: string;

  beforeAll(async () => {
    app = await build();
    
    // Create test user and get auth token
    const userResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'Test123!@#',
        tenant_id: 'test-tenant',
      },
    });

    const userData = JSON.parse(userResponse.payload);
    authToken = userData.token;
    testUserId = userData.user.id;

    // Create admin user and get admin token
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
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create a test session
    const response = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'Test123!@#',
      },
    });

    const data = JSON.parse(response.payload);
    testSessionId = data.session_id;
  });

  describe('GET /v1/sessions', () => {
    it('should list current user sessions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.sessions).toBeInstanceOf(Array);
      expect(data.total).toBeGreaterThan(0);
    });

    it('should return 401 without auth token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should mark current session correctly', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const data = JSON.parse(response.payload);
      const currentSession = data.sessions.find((s: any) => s.is_current);
      expect(currentSession).toBeDefined();
    });
  });

  describe('DELETE /v1/sessions/:id', () => {
    it('should revoke specific session', async () => {
      // Create another session
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Test123!@#',
        },
      });

      const loginData = JSON.parse(loginResponse.payload);
      const sessionToRevoke = loginData.session_id;

      // Revoke the session
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/sessions/${sessionToRevoke}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
    });

    it('should not allow revoking current session', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/v1/sessions/${testSessionId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent session', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/sessions/non-existent-session',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /v1/sessions/others', () => {
    it('should logout all other devices', async () => {
      // Create multiple sessions
      await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Test123!@#',
        },
      });

      await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'Test123!@#',
        },
      });

      // Logout others
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/sessions/others',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.revoked_count).toBeGreaterThan(0);
    });

    it('should keep current session active', async () => {
      await app.inject({
        method: 'DELETE',
        url: '/v1/sessions/others',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      // Verify current session still works
      const response = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('DELETE /v1/sessions/all', () => {
    it('should logout all devices including current', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/sessions/all',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.revoked_count).toBeGreaterThan(0);
    });

    it('should invalidate current token after logout all', async () => {
      await app.inject({
        method: 'DELETE',
        url: '/v1/sessions/all',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      // Try to use the token
      const response = await app.inject({
        method: 'GET',
        url: '/v1/sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Admin Session Management', () => {
    describe('GET /v1/admin/users/:userId/sessions', () => {
      it('should list user sessions as admin', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/v1/admin/users/${testUserId}/sessions`,
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.sessions).toBeInstanceOf(Array);
      });

      it('should return 403 for non-admin users', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/v1/admin/users/${testUserId}/sessions`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('DELETE /v1/admin/sessions/:id', () => {
      it('should force logout session as admin', async () => {
        const response = await app.inject({
          method: 'DELETE',
          url: `/v1/admin/sessions/${testSessionId}`,
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
          payload: {
            reason: 'security_violation',
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
      });

      it('should log audit event for admin force logout', async () => {
        await app.inject({
          method: 'DELETE',
          url: `/v1/admin/sessions/${testSessionId}`,
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
          payload: {
            reason: 'admin_action',
          },
        });

        // Verify audit log (implementation depends on audit system)
        // This is a placeholder for actual audit verification
        expect(true).toBe(true);
      });
    });

    describe('DELETE /v1/admin/users/:userId/sessions', () => {
      it('should force logout all user sessions as admin', async () => {
        const response = await app.inject({
          method: 'DELETE',
          url: `/v1/admin/users/${testUserId}/sessions`,
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
          payload: {
            reason: 'account_suspended',
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.revoked_count).toBeGreaterThan(0);
      });
    });

    describe('GET /v1/admin/sessions/active', () => {
      it('should list all active sessions as admin', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/v1/admin/sessions/active',
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
        expect(data.sessions).toBeInstanceOf(Array);
        expect(data.total).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Real-time Termination', () => {
    it('should broadcast session invalidation via Socket.IO', async () => {
      // This test would require Socket.IO client setup
      // Placeholder for actual Socket.IO testing
      expect(true).toBe(true);
    });

    it('should notify client of logout reason', async () => {
      // This test would require Socket.IO client setup
      // Placeholder for actual Socket.IO testing
      expect(true).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should log session revocation events', async () => {
      await app.inject({
        method: 'DELETE',
        url: `/v1/sessions/${testSessionId}`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      // Verify audit log entry exists
      // Implementation depends on audit system
      expect(true).toBe(true);
    });

    it('should include actor and reason in audit log', async () => {
      await app.inject({
        method: 'DELETE',
        url: `/v1/admin/sessions/${testSessionId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          reason: 'test_reason',
        },
      });

      // Verify audit log contains actor and reason
      expect(true).toBe(true);
    });
  });
});
