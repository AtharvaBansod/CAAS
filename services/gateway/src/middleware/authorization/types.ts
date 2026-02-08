/**
 * Authorization Middleware Types
 */

import { FastifyRequest } from 'fastify';

/**
 * Authorization options
 */
export interface AuthzOptions {
  enabled?: boolean;
  skipRoutes?: string[];
  auditEnabled?: boolean;
}

/**
 * Subject for authorization
 */
export interface AuthzSubject {
  user_id: string;
  tenant_id: string;
  roles: string[];
  attributes: Record<string, unknown>;
}

/**
 * Resource for authorization
 */
export interface AuthzResource {
  type: string;
  id?: string;
  tenant_id: string;
  owner_id?: string;
  attributes: Record<string, unknown>;
}

/**
 * Environment context
 */
export interface AuthzEnvironment {
  ip_address: string;
  time: Date;
  device_type?: string;
  user_agent?: string;
}

/**
 * Authorization request
 */
export interface AuthzRequest {
  subject: AuthzSubject;
  resource: AuthzResource;
  action: string;
  environment: AuthzEnvironment;
}

/**
 * Authorization decision
 */
export interface AuthzDecision {
  allowed: boolean;
  reason?: string;
  matched_policies?: string[];
  cached?: boolean;
}

/**
 * Extended Fastify request with authorization context
 */
export interface AuthzFastifyRequest extends FastifyRequest {
  authz?: {
    subject: AuthzSubject;
    resource: AuthzResource;
    action: string;
  };
}
