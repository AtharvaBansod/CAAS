/**
 * Session Controller
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { SessionService } from '../services/session.service';
import { TokenService } from '../services/token.service';

export class SessionController {
  private sessionService: SessionService;
  private tokenService: TokenService;

  constructor() {
    this.sessionService = new SessionService();
    this.tokenService = new TokenService();
  }

  async listSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = this.extractToken(request);

      if (!token) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      const payload = await this.tokenService.validateToken(token);
      const sessions = await this.sessionService.getUserSessions(payload.user_id);

      return reply.send({ sessions });
    } catch (error) {
      request.log.error({ error }, 'List sessions error');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async terminateSession(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { session_id } = request.params as any;
      const token = this.extractToken(request);

      if (!token) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      const payload = await this.tokenService.validateToken(token);

      // Verify user owns the session
      const session = await this.sessionService.getSession(session_id);

      if (!session || session.user_id !== payload.user_id) {
        return reply.status(403).send({
          error: 'Forbidden',
        });
      }

      await this.sessionService.terminateSession(session_id);

      return reply.send({
        message: 'Session terminated successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Terminate session error');
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
