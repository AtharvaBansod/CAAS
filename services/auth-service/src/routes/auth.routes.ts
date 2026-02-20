/**
 * Authentication Routes
 */

import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller';

export async function authRoutes(server: FastifyInstance) {
  const authController = new AuthController();

  // Login
  server.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'tenant_id'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          tenant_id: { type: 'string' },
          device_info: { type: 'object' },
        },
      },
    },
  }, authController.login.bind(authController));

  // Token refresh
  server.post('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string' },
        },
      },
    },
  }, authController.refresh.bind(authController));

  // Logout
  server.post('/logout', {
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
    },
  }, authController.logout.bind(authController));

  // Token validation
  server.post('/validate', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' },
        },
      },
    },
  }, authController.validate.bind(authController));

  // Session info
  server.get('/session', {
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
    },
  }, authController.getSession.bind(authController));

  // MFA Challenge
  server.post('/mfa/challenge', {
    schema: {
      body: {
        type: 'object',
        required: ['user_id', 'session_id'],
        properties: {
          user_id: { type: 'string' },
          session_id: { type: 'string' },
          methods: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, authController.mfaChallenge.bind(authController));

  // MFA Verify
  server.post('/mfa/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['challenge_id', 'code'],
        properties: {
          challenge_id: { type: 'string' },
          code: { type: 'string' },
        },
      },
    },
  }, authController.mfaVerify.bind(authController));

  // Revoke tokens
  server.post('/revoke', {
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          token_id: { type: 'string' },
          user_id: { type: 'string' },
          session_id: { type: 'string' },
        },
      },
    },
  }, authController.revoke.bind(authController));
}
