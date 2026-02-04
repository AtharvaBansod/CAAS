import { FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../../errors';
import { AuthContext } from './auth-context';

export abstract class AuthStrategy {
  abstract name: string;
  abstract authenticate(request: FastifyRequest): Promise<AuthContext | null>;
}
