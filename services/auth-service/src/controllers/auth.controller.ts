/**
 * Authentication Controller
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { MFAService } from '../services/mfa.service';
import { RevocationService } from '../services/revocation.service';

export class AuthController {
  private authService: AuthService;
  private tokenService: TokenService;
  private sessionService: SessionService;
  private mfaService: MFAService;
  private revocationService: RevocationService;

  constructor() {
    this.authService = new AuthService();
    this.tokenService = new TokenService();
    this.sessionService = new SessionService();
    this.mfaService = new MFAService();
    this.revocationService = new RevocationService();
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, password, tenant_id, device_info } = request.body as any;

      // Authenticate user
      const user = await this.authService.authenticateUser(email, password, tenant_id);

      if (!user) {
        return reply.status(401).send({
          error: 'Invalid credentials',
        });
      }

      // Check if MFA is required
      if (user.mfa_enabled) {
        // Create MFA challenge
        const session = await this.sessionService.createPendingSession({
          user_id: user.user_id,
          tenant_id,
          device_info,
          ip_address: request.ip,
          user_agent: request.headers['user-agent'] || '',
        });

        const challenge = await this.mfaService.createChallenge(
          user.user_id,
          session.session_id,
          ['totp', 'backup_code']
        );

        return reply.send({
          requires_mfa: true,
          challenge_id: challenge.challenge_id,
          methods: challenge.methods,
        });
      }

      // Create session
      const session = await this.sessionService.createSession({
        user_id: user.user_id,
        tenant_id,
        device_info,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'] || '',
      });

      // Generate tokens
      const tokens = await this.tokenService.generateTokenPair(user, session);

      return reply.send({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        user: {
          user_id: user.user_id,
          email: user.email,
          tenant_id: user.tenant_id,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Login error');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async refresh(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { refresh_token } = request.body as any;

      // Validate and refresh token
      const result = await this.tokenService.refreshToken(refresh_token);

      return reply.send(result);
    } catch (error) {
      request.log.error({ error }, 'Token refresh error');
      return reply.status(401).send({
        error: 'Invalid refresh token',
      });
    }
  }

  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = this.extractToken(request);

      if (!token) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      // Validate token and get session
      const payload = await this.tokenService.validateToken(token);

      // Terminate session
      await this.sessionService.terminateSession(payload.session_id);

      // Revoke tokens
      await this.revocationService.revokeSession(payload.session_id);

      return reply.send({
        message: 'Logged out successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Logout error');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async validate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token } = request.body as any;

      // Validate token
      const payload = await this.tokenService.validateToken(token);

      // Check if token is revoked
      const isRevoked = await this.revocationService.isRevoked(payload.jti);

      if (isRevoked) {
        return reply.status(401).send({
          valid: false,
          error: 'Token revoked',
        });
      }

      // Get session info
      const session = await this.sessionService.getSession(payload.session_id);

      if (!session || !session.is_active) {
        return reply.status(401).send({
          valid: false,
          error: 'Session invalid',
        });
      }

      return reply.send({
        valid: true,
        payload,
        session,
      });
    } catch (error) {
      request.log.error({ error }, 'Token validation error');
      return reply.status(401).send({
        valid: false,
        error: 'Invalid token',
      });
    }
  }

  async getSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = this.extractToken(request);

      if (!token) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      const payload = await this.tokenService.validateToken(token);
      const session = await this.sessionService.getSession(payload.session_id);

      return reply.send(session);
    } catch (error) {
      request.log.error({ error }, 'Get session error');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async mfaChallenge(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { user_id, session_id, methods } = request.body as any;

      const challenge = await this.mfaService.createChallenge(
        user_id,
        session_id,
        methods || ['totp', 'backup_code']
      );

      return reply.send(challenge);
    } catch (error) {
      request.log.error({ error }, 'MFA challenge error');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async mfaVerify(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { challenge_id, code } = request.body as any;

      const result = await this.mfaService.verifyChallenge(challenge_id, code);

      if (!result.valid) {
        return reply.status(401).send({
          error: 'Invalid MFA code',
        });
      }

      // Activate session
      await this.sessionService.activateSession(result.session_id);

      // Generate tokens
      const user = await this.authService.getUserById(result.user_id);
      const session = await this.sessionService.getSession(result.session_id);
      const tokens = await this.tokenService.generateTokenPair(user, session);

      return reply.send({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
      });
    } catch (error) {
      request.log.error({ error }, 'MFA verify error');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async revoke(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { token_id, user_id, session_id } = request.body as any;

      if (token_id) {
        await this.revocationService.revokeToken(token_id);
      } else if (user_id) {
        await this.revocationService.revokeUser(user_id);
      } else if (session_id) {
        await this.revocationService.revokeSession(session_id);
      } else {
        return reply.status(400).send({
          error: 'Must provide token_id, user_id, or session_id',
        });
      }

      return reply.send({
        message: 'Revoked successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Revoke error');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  private extractToken(request: FastifyRequest): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
