/**
 * Session Services Plugin
 * Exposes session management services from auth-services to routes
 */

import fp from 'fastify-plugin';
import { MFAEnforcement } from '../middleware/mfa/mfa-enforcement';
import { auditLogger } from '../middleware/logging/audit-logger';

// Simple DeviceSync implementation for gateway
class GatewayDeviceSync {
  private redis: any;
  private logger: any;

  constructor(redis: any, logger: any) {
    this.redis = redis;
    this.logger = logger;
  }

  async broadcastSessionUpdate(io: any, userId: string, updates: Record<string, any>): Promise<void> {
    this.logger.debug({ userId, updates }, 'DeviceSync: broadcastSessionUpdate');
    // Publish to Redis for cross-server sync
    const channel = `session:sync:${userId}`;
    const event = { type: 'session_update', userId, updates, timestamp: Date.now() };
    await this.redis.publish(channel, JSON.stringify(event));
  }

  async handleSessionInvalidated(io: any, userId: string, sessionId: string, reason: string): Promise<void> {
    this.logger.debug({ userId, sessionId, reason }, 'DeviceSync: handleSessionInvalidated');
    const channel = `session:sync:${userId}`;
    const event = { type: 'session_invalidated', userId, sessionId, reason, timestamp: Date.now() };
    await this.redis.publish(channel, JSON.stringify(event));
  }

  async handleDeviceAdded(io: any, userId: string, deviceInfo: any): Promise<void> {
    this.logger.debug({ userId, deviceInfo }, 'DeviceSync: handleDeviceAdded');
    const channel = `session:sync:${userId}`;
    const event = { type: 'device_added', userId, deviceInfo, timestamp: Date.now() };
    await this.redis.publish(channel, JSON.stringify(event));
  }

  async handleDeviceRemoved(io: any, userId: string, deviceId: string): Promise<void> {
    this.logger.debug({ userId, deviceId }, 'DeviceSync: handleDeviceRemoved');
    const channel = `session:sync:${userId}`;
    const event = { type: 'device_removed', userId, deviceId, timestamp: Date.now() };
    await this.redis.publish(channel, JSON.stringify(event));
  }

  async cleanup(): Promise<void> {
    this.logger.debug('DeviceSync: cleanup');
  }
}

async function sessionServicesPlugin(fastify: any) {
  // Phase 4.5.0: Auth client is now used instead of embedded auth services
  // Session management is handled by the standalone auth service
  
  try {
    // Initialize device sync
    const redis = fastify.redis;
    if (redis) {
      const deviceSync = new GatewayDeviceSync(redis, fastify.log);
      fastify.decorate('deviceSync', deviceSync);
      fastify.log.info('Device sync initialized');

      // Cleanup on close
      fastify.addHook('onClose', async () => {
        await deviceSync.cleanup();
      });
    }

    // Initialize audit logger
    fastify.decorate('auditLogger', auditLogger);
    fastify.log.info('Audit logger initialized');

    // Initialize MFA enforcement
    const mfaEnforcement = new MFAEnforcement(fastify.log);
    fastify.decorate('mfaEnforcement', mfaEnforcement);
    fastify.log.info('MFA enforcement initialized');

    // Add requireMFA decorator
    fastify.decorate('requireMFA', async (request: any, reply: any) => {
      await mfaEnforcement.enforce(request, reply);
    });

    // Add requireAdmin decorator if not already present
    if (!fastify.hasDecorator('requireAdmin')) {
      fastify.decorate('requireAdmin', async (request: any, reply: any) => {
        const userRoles = request.user?.roles || [];
        if (!userRoles.includes('admin')) {
          return reply.code(403).send({ error: 'Admin access required' });
        }
      });
    }

    fastify.log.info('Session services plugin registered successfully');
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to initialize session services');
    throw error;
  }
}

export default fp(sessionServicesPlugin, {
  name: 'session-services',
});
