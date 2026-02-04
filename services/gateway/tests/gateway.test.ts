import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';

describe('Gateway Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    console.log('Starting Gateway Integration Tests...');
    app = await buildApp();
    await app.ready();
    console.log('App ready');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /health should return 200', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok', timestamp: expect.any(String) });
      
      // Check Rate Limit Headers
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('GET /v1/ping should return pong from v1', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/ping'
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ message: 'pong from v1' });
    });
  });

  describe('Authentication', () => {
    it('should return 401 if no token provided for protected route', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/tenant',
      });
      expect([401, 403]).toContain(response.statusCode);
    });

    it('should return 200/404 (not 401) if valid token provided', async () => {
      const privateKey = config.JWT_PRIVATE_KEY;
      
      const token = jwt.sign(
        { 
          sub: 'user-123',
          tenantId: 'tenant-123',
          permissions: ['tenant:read'],
          roles: ['admin']
        },
        privateKey,
        { algorithm: 'RS256' }
      );

      const response = await app.inject({
        method: 'GET',
        url: '/v1/tenant',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).not.toBe(401);
    });

    it('should authenticate with valid API Key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/tenant',
        headers: {
          'x-api-key': 'dev-api-key'
        }
      });
      
      expect(response.statusCode).not.toBe(401);
    });

    it('should fail with invalid API Key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/tenant',
        headers: {
          'x-api-key': 'invalid-key'
        }
      });
      
      expect([401, 403]).toContain(response.statusCode);
    });

    it('should authenticate with valid SDK credentials', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/tenant',
        headers: {
          'x-app-id': 'app-tenant-123',
          'x-app-secret': 'secret-123'
        }
      });
      expect(response.statusCode).not.toBe(401);
    });
  });

  describe('Request Validation', () => {
    it('should return 400 for invalid request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/auth/sdk/token',
        body: {
          app_id: '123',
          // missing app_secret
        }
      });
      
      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body).toHaveProperty('statusCode', 400);
      
      if (body.details) {
         expect(Array.isArray(body.details)).toBe(true);
         expect(body.details[0]).toHaveProperty('field');
         expect(body.details[0]).toHaveProperty('message');
      }
    });
  });
});
