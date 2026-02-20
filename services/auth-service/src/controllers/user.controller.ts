/**
 * User Controller
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from '../services/user.service';
import { TokenService } from '../services/token.service';

export class UserController {
  private userService: UserService;
  private tokenService: TokenService;

  constructor() {
    this.userService = new UserService();
    this.tokenService = new TokenService();
  }

  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = this.extractToken(request);

      if (!token) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      const payload = await this.tokenService.validateToken(token);
      const user = await this.userService.getUserProfile(payload.user_id);

      return reply.send(user);
    } catch (error) {
      request.log.error({ error }, 'Get profile error');
      return reply.status(500).send({
        error: 'Internal server error',
      });
    }
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    try {
      const token = this.extractToken(request);

      if (!token) {
        return reply.status(401).send({ error: 'No token provided' });
      }

      const payload = await this.tokenService.validateToken(token);
      const updates = request.body as any;

      const user = await this.userService.updateUserProfile(payload.user_id, updates);

      return reply.send(user);
    } catch (error) {
      request.log.error({ error }, 'Update profile error');
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
