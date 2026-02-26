import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { TenantContext } from '../middleware/tenant/tenant-context';

declare module 'fastify' {
  interface FastifyInstance {
    container: {
      resolve<T>(name: string): T;
    };
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireAdmin?(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    sessionStore?: any;
    revocationService?: any;
    deviceSync?: any;
    io?: any;
    auditLogger?: any;
    mfaEnforcement?: any;
  }

  interface FastifyRequest {
    user?: {
      id: string;
      user_id?: string;
      tenant_id: string;
      sub?: string;
      jti?: string;
      email?: string;
      roles?: string[];
      scopes?: string[];
    };
    apiVersion?: string;
    session?: any;
    file?: any;
    tenant?: TenantContext | (Record<string, unknown> & { id?: string; tenant_id?: string });
  }
}
