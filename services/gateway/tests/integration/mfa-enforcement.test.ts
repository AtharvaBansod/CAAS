import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../helper';
import { FastifyInstance } from 'fastify';
import { authenticator } from 'otplib';

describe('MFA Enforcement', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;
  let mfaSecret: string;

  beforeAll(async () => {
    app = await build();
    
    // Create test user
    const userResponse = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email: 'mfa-test@example.com',
        password: 'Test123!@#',
        tenant_id: 'test-tenant',
      },
    });

    const userData = JSON.parse(userResponse.payload);
    authToken = userData.token;
    testUserId = userData.user.id;

    // Setup MFA for user
    mfaSecret = authenticator.generateSecret();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('MFA Requirement Checking', () => {
    it('should allow access when MFA is optional', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should block access when MFA is required but not verified', async () => {
      // Set tenant MFA to REQUIRED
      await app.inject({
        method: 'PUT',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          level: 'REQUIRED',
          methods: ['totp', 'backup_code'],
          trusted_device_days: 30,
          grace_period_days: 0,
          exempt_users: [],
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const data = JSON.parse(response.payload);
      expect(data.mfa_challenge_required).toBe(true);
    });

    it('should allow access after MFA verification', async () => {
      // Configure user MFA
      await app.inject({
        method: 'POST',
        url: '/v1/mfa/setup',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          secret: mfaSecret,
        },
      });

      // Verify MFA
      const code = authenticator.generate(mfaSecret);
      await app.inject({
        method: 'POST',
        url: '/v1/mfa/verify',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code,
          trust_device: false,
        },
      });

      // Now access should be granted
      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Trusted Device Bypass', () => {
    it('should bypass MFA for trusted devices', async () => {
      // Verify MFA with trust device
      const code = authenticator.generate(mfaSecret);
      const verifyResponse = await app.inject({
        method: 'POST',
        url: '/v1/mfa/verify',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code,
          trust_device: true,
        },
      });

      const verifyData = JSON.parse(verifyResponse.payload);
      expect(verifyData.trusted_device_token).toBeDefined();

      // Create new session with trusted device cookie
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'mfa-test@example.com',
          password: 'Test123!@#',
        },
        headers: {
          cookie: `trusted_device=${verifyData.trusted_device_token}`,
        },
      });

      const loginData = JSON.parse(loginResponse.payload);
      const newToken = loginData.token;

      // Access should be granted without MFA challenge
      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${newToken}`,
          cookie: `trusted_device=${verifyData.trusted_device_token}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should not bypass MFA with invalid trusted device token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${authToken}`,
          cookie: 'trusted_device=invalid-token',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('TOTP Verification', () => {
    it('should verify valid TOTP code', async () => {
      const code = authenticator.generate(mfaSecret);
      
      const response = await app.inject({
        method: 'POST',
        url: '/v1/mfa/verify',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code,
          trust_device: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.mfa_verified).toBe(true);
    });

    it('should reject invalid TOTP code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/mfa/verify',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code: '000000',
          trust_device: false,
        },
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
    });

    it('should track MFA status in session', async () => {
      const code = authenticator.generate(mfaSecret);
      
      await app.inject({
        method: 'POST',
        url: '/v1/mfa/verify',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code,
          trust_device: false,
        },
      });

      // Check MFA status
      const statusResponse = await app.inject({
        method: 'GET',
        url: '/v1/mfa/status',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const statusData = JSON.parse(statusResponse.payload);
      expect(statusData.mfa_verified).toBe(true);
    });
  });

  describe('Backup Code Usage', () => {
    let backupCodes: string[];

    beforeEach(async () => {
      // Generate backup codes
      const response = await app.inject({
        method: 'POST',
        url: '/v1/mfa/backup-codes/generate',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      const data = JSON.parse(response.payload);
      backupCodes = data.codes;
    });

    it('should verify valid backup code', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/mfa/backup',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code: backupCodes[0],
          trust_device: false,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.mfa_verified).toBe(true);
    });

    it('should mark backup code as used', async () => {
      const code = backupCodes[0];
      
      // Use the code
      await app.inject({
        method: 'POST',
        url: '/v1/mfa/backup',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code,
          trust_device: false,
        },
      });

      // Try to use it again
      const response = await app.inject({
        method: 'POST',
        url: '/v1/mfa/backup',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code,
          trust_device: false,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should track remaining backup codes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/mfa/backup',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          code: backupCodes[0],
          trust_device: false,
        },
      });

      const data = JSON.parse(response.payload);
      expect(data.remaining_codes).toBe(backupCodes.length - 1);
    });
  });

  describe('MFA Levels', () => {
    it('should enforce REQUIRED level for all users', async () => {
      await app.inject({
        method: 'PUT',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          level: 'REQUIRED',
          methods: ['totp'],
          trusted_device_days: 30,
          grace_period_days: 0,
          exempt_users: [],
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should enforce ADMIN_ONLY level for admin users', async () => {
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
      const adminToken = adminData.token;

      // Set MFA to ADMIN_ONLY
      await app.inject({
        method: 'PUT',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: adminToken,
        },
        payload: {
          level: 'ADMIN_ONLY',
          methods: ['totp'],
          trusted_device_days: 30,
          grace_period_days: 0,
          exempt_users: [],
        },
      });

      // Admin should be blocked
      const response = await app.inject({
        method: 'GET',
        url: '/v1/admin/users',
        headers: {
          authorization: adminToken,
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should respect OPTIONAL level', async () => {
      await app.inject({
        method: 'PUT',
        url: '/v1/admin/tenant/mfa',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          level: 'OPTIONAL',
          methods: ['totp'],
          trusted_device_days: 30,
          grace_period_days: 0,
          exempt_users: [],
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/profile',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('MFA Challenge Flow', () => {
    it('should initiate MFA challenge', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/mfa/challenge',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          method: 'totp',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data.challenge_id).toBeDefined();
      expect(data.method).toBe('totp');
      expect(data.expires_at).toBeGreaterThan(Date.now());
    });

    it('should expire challenge after timeout', async () => {
      const challengeResponse = await app.inject({
        method: 'POST',
        url: '/v1/mfa/challenge',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          method: 'totp',
        },
      });

      const challengeData = JSON.parse(challengeResponse.payload);

      // Wait for expiry (in real test, mock time)
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Try to verify with expired challenge
      const code = authenticator.generate(mfaSecret);
      const response = await app.inject({
        method: 'POST',
        url: '/v1/mfa/verify',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          challenge_id: challengeData.challenge_id,
          code,
        },
      });

      // Should fail due to expired challenge
      expect(response.statusCode).toBe(400);
    });
  });

  describe('MFA Status Endpoint', () => {
    it('should return complete MFA status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/mfa/status',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('mfa_required');
      expect(data).toHaveProperty('mfa_verified');
      expect(data).toHaveProperty('mfa_configured');
      expect(data).toHaveProperty('trusted_device');
      expect(data).toHaveProperty('methods_available');
    });
  });
});
