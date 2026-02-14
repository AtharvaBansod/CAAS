import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ObjectId } from 'mongodb';
import { MFARequirementLevel } from '../../../middleware/mfa/mfa-enforcement';

const MFAConfigSchema = z.object({
  level: z.nativeEnum(MFARequirementLevel),
  methods: z.array(z.string()),
  trusted_device_days: z.number().min(1).max(365),
  grace_period_days: z.number().min(0).max(90),
  exempt_users: z.array(z.string()),
});

const MFAUserStatusSchema = z.object({
  user_id: z.string(),
  mfa_enabled: z.boolean(),
  mfa_verified: z.boolean(),
  last_verification: z.number().optional(),
  backup_codes_remaining: z.number(),
});

export async function adminMFARoutes(fastify: FastifyInstance) {
  /**
   * GET /v1/admin/tenant/mfa
   * Get tenant MFA configuration
   */
  fastify.get('/admin/tenant/mfa', {
    schema: {
      description: 'Get tenant MFA configuration',
      tags: ['admin', 'mfa'],
      response: {
        200: z.object({
          config: MFAConfigSchema,
        }),
      },
    },
    preHandler: [fastify.requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenant?.id;
    const adminId = request.user?.id;

    if (!tenantId) {
      return reply.code(400).send({ error: 'Tenant ID required' });
    }

    try {
      const db = fastify.mongo.db;
      const collection = db.collection('saas_clients');

      const tenant = await collection.findOne({
        $or: [
          { _id: ObjectId.isValid(tenantId) ? new ObjectId(tenantId) : tenantId },
          { tenant_id: tenantId },
          { app_id: tenantId },
        ],
      } as any);

      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      // Return default config if not set
      const config = tenant.mfa_config || {
        level: MFARequirementLevel.OPTIONAL,
        methods: ['totp', 'backup_code'],
        trusted_device_days: 30,
        grace_period_days: 7,
        exempt_users: [],
      };

      return reply.send({ config });
    } catch (error) {
      request.log.error({ error, tenantId, adminId }, 'Failed to get MFA config');
      return reply.code(500).send({ error: 'Failed to retrieve configuration' });
    }
  });

  /**
   * PUT /v1/admin/tenant/mfa
   * Update tenant MFA configuration
   */
  fastify.put('/admin/tenant/mfa', {
    schema: {
      description: 'Update tenant MFA configuration',
      tags: ['admin', 'mfa'],
      body: MFAConfigSchema,
      response: {
        200: z.object({
          success: z.boolean(),
          config: MFAConfigSchema,
        }),
      },
    },
    preHandler: [fastify.requireAdmin],
  }, async (
    request: FastifyRequest<{ Body: z.infer<typeof MFAConfigSchema> }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.tenant?.id;
    const adminId = request.user?.id;
    const config = request.body;

    if (!tenantId) {
      return reply.code(400).send({ error: 'Tenant ID required' });
    }

    try {
      const db = fastify.mongo.db;
      const collection = db.collection('saas_clients');

      // Update tenant MFA config
      const tenantFilter = ObjectId.isValid(tenantId) ? { _id: new ObjectId(tenantId) } : { tenant_id: tenantId };
      await collection.updateOne(
        tenantFilter as any,
        {
          $set: {
            mfa_config: {
              level: config.level,
              methods: config.methods,
              trustedDeviceDays: config.trusted_device_days,
              gracePeriodDays: config.grace_period_days,
              exemptUsers: config.exempt_users,
            },
            updated_at: new Date(),
          },
        }
      );

      // Audit log
      await fastify.auditLogger.log({
        action: 'mfa_config_updated',
        actor_id: adminId!,
        resource_type: 'tenant',
        resource_id: tenantId,
        details: { config },
      });

      request.log.info({ tenantId, adminId, config }, 'MFA configuration updated');

      return reply.send({
        success: true,
        config,
      });
    } catch (error) {
      request.log.error({ error, tenantId, adminId }, 'Failed to update MFA config');
      return reply.code(500).send({ error: 'Failed to update configuration' });
    }
  });

  /**
   * GET /v1/admin/users/mfa-status
   * List users with MFA status
   */
  fastify.get('/admin/users/mfa-status', {
    schema: {
      description: 'List users with MFA status',
      tags: ['admin', 'mfa'],
      querystring: z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        mfa_enabled: z.boolean().optional(),
      }),
      response: {
        200: z.object({
          users: z.array(MFAUserStatusSchema),
          total: z.number(),
          limit: z.number(),
          offset: z.number(),
        }),
      },
    },
    preHandler: [fastify.requireAdmin],
  }, async (
    request: FastifyRequest<{
      Querystring: { limit?: number; offset?: number; mfa_enabled?: boolean };
    }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.tenant?.id;
    const { limit = 50, offset = 0, mfa_enabled } = request.query;

    if (!tenantId) {
      return reply.code(400).send({ error: 'Tenant ID required' });
    }

    try {
      const tenantDb = fastify.mongo.client.db(tenantId);
      const usersCollection = tenantDb.collection('users');

      // Build query
      const query: any = {};
      if (mfa_enabled !== undefined) {
        query.mfa_secret = mfa_enabled ? { $exists: true } : { $exists: false };
      }

      // Get users
      const users = await usersCollection
        .find(query)
        .skip(offset)
        .limit(limit)
        .toArray();

      const total = await usersCollection.countDocuments(query);

      // Map to status format
      const userStatuses = users.map(user => ({
        user_id: user._id,
        mfa_enabled: !!user.mfa_secret,
        mfa_verified: !!user.mfa_verified_at,
        last_verification: user.mfa_verified_at?.getTime(),
        backup_codes_remaining: user.mfa_backup_codes?.filter((bc: any) => !bc.used).length || 0,
      }));

      return reply.send({
        users: userStatuses,
        total,
        limit,
        offset,
      });
    } catch (error) {
      request.log.error({ error, tenantId }, 'Failed to list user MFA status');
      return reply.code(500).send({ error: 'Failed to retrieve user status' });
    }
  });

  /**
   * POST /v1/admin/users/:userId/mfa/enforce
   * Enforce MFA for specific user
   */
  fastify.post('/admin/users/:userId/mfa/enforce', {
    schema: {
      description: 'Enforce MFA for user',
      tags: ['admin', 'mfa'],
      params: z.object({
        userId: z.string(),
      }),
      body: z.object({
        grace_period_days: z.number().min(0).max(90).optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
        }),
      },
    },
    preHandler: [fastify.requireAdmin],
  }, async (
    request: FastifyRequest<{
      Params: { userId: string };
      Body: { grace_period_days?: number };
    }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.tenant?.id;
    const { userId } = request.params;
    const { grace_period_days = 7 } = request.body;
    const adminId = request.user?.id;

    if (!tenantId) {
      return reply.code(400).send({ error: 'Tenant ID required' });
    }

    try {
      const tenantDb = fastify.mongo.client.db(tenantId);
      const usersCollection = tenantDb.collection('users');

      // Check if user exists
      const user = await usersCollection.findOne({ _id: userId } as any);
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Set MFA enforcement
      const enforcementDate = new Date();
      enforcementDate.setDate(enforcementDate.getDate() + grace_period_days);

      await usersCollection.updateOne(
        { _id: userId } as any,
        {
          $set: {
            mfa_required: true,
            mfa_enforcement_date: enforcementDate,
            updated_at: new Date(),
          },
        }
      );

      // Audit log
      await fastify.auditLogger.log({
        action: 'mfa_enforced',
        actor_id: adminId!,
        resource_type: 'user',
        resource_id: userId,
        details: { grace_period_days, enforcement_date: enforcementDate },
      });

      request.log.info({ tenantId, userId, adminId, grace_period_days }, 'MFA enforced for user');

      return reply.send({
        success: true,
        message: `MFA will be enforced after ${grace_period_days} days grace period`,
      });
    } catch (error) {
      request.log.error({ error, tenantId, userId }, 'Failed to enforce MFA');
      return reply.code(500).send({ error: 'Failed to enforce MFA' });
    }
  });

  /**
   * POST /v1/admin/mfa/enforce-all
   * Enforce MFA for all users in tenant
   */
  fastify.post('/admin/mfa/enforce-all', {
    schema: {
      description: 'Enforce MFA for all users',
      tags: ['admin', 'mfa'],
      body: z.object({
        grace_period_days: z.number().min(0).max(90).optional(),
        exclude_users: z.array(z.string()).optional(),
      }),
      response: {
        200: z.object({
          success: z.boolean(),
          affected_users: z.number(),
        }),
      },
    },
    preHandler: [fastify.requireAdmin],
  }, async (
    request: FastifyRequest<{
      Body: { grace_period_days?: number; exclude_users?: string[] };
    }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.tenant?.id;
    const { grace_period_days = 7, exclude_users = [] } = request.body;
    const adminId = request.user?.id;

    if (!tenantId) {
      return reply.code(400).send({ error: 'Tenant ID required' });
    }

    try {
      const tenantDb = fastify.mongo.client.db(tenantId);
      const usersCollection = tenantDb.collection('users');

      // Calculate enforcement date
      const enforcementDate = new Date();
      enforcementDate.setDate(enforcementDate.getDate() + grace_period_days);

      // Update all users except excluded
      const result = await usersCollection.updateMany(
        { _id: { $nin: exclude_users } } as any,
        {
          $set: {
            mfa_required: true,
            mfa_enforcement_date: enforcementDate,
            updated_at: new Date(),
          },
        }
      );

      // Audit log
      await fastify.auditLogger.log({
        action: 'mfa_enforced_all',
        actor_id: adminId!,
        resource_type: 'tenant',
        resource_id: tenantId,
        details: {
          grace_period_days,
          affected_users: result.modifiedCount,
          exclude_users,
        },
      });

      request.log.info(
        { tenantId, adminId, affectedUsers: result.modifiedCount },
        'MFA enforced for all users'
      );

      return reply.send({
        success: true,
        affected_users: result.modifiedCount,
      });
    } catch (error) {
      request.log.error({ error, tenantId }, 'Failed to enforce MFA for all users');
      return reply.code(500).send({ error: 'Failed to enforce MFA' });
    }
  });
}
