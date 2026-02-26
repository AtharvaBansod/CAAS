/**
 * Admin Routes
 * 
 * Administrative endpoints for platform management
 */

import { FastifyInstance } from 'fastify';
import { dlqAdminRoutes } from './dlq';
import { adminSessionsRoutes } from './sessions';
import { adminMFARoutes } from './mfa';
import dashboardRoutes from './dashboard';

export async function adminRoutes(fastify: FastifyInstance) {
  // Register DLQ admin routes
  await fastify.register(dlqAdminRoutes, { prefix: '/admin' });

  // Register admin sessions routes
  await fastify.register(adminSessionsRoutes, { prefix: '/admin' });

  // Register admin MFA routes
  await fastify.register(adminMFARoutes, { prefix: '/admin' });

  // Register dashboard routes
  await fastify.register(dashboardRoutes, { prefix: '/admin' });
}
