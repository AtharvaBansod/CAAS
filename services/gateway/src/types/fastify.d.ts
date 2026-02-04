import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      roles: string[];
      tenantId: string;
    };
    apiVersion?: string;
  }
}
