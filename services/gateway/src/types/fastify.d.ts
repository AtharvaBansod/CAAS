import { FastifyRequest } from 'fastify';
import '@fastify/jwt';

export interface UserPayload {
  // JWT standard claims
  sub: string;           // user_id
  jti: string;           // token_id
  iat: number;           // issued_at
  exp: number;           // expires_at

  // Custom claims
  user_id: string;
  tenant_id: string;
  session_id: string;
  device_id?: string;
  scopes: string[];
  roles: string[];

  // Compatibility
  id: string;            // alias for sub
  tenantId: string;      // alias for tenant_id
  email: string;        // often present
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: UserPayload;
    apiVersion?: string;
  }
}
