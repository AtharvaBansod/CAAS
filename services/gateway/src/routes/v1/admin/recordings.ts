import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// Schema definitions
const GetRecordingsQuerySchema = z.object({
  conversation_id: z.string().optional(),
  call_id: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  consent_status: z.enum(['pending', 'all_consented', 'partial', 'denied']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const GetRecordingParamsSchema = z.object({
  recording_id: z.string(),
});

const DeleteRecordingParamsSchema = z.object({
  recording_id: z.string(),
});

const RecordingMetadataSchema = z.object({
  recording_id: z.string(),
  call_id: z.string(),
  conversation_id: z.string(),
  tenant_id: z.string(),
  participants: z.array(
    z.object({
      user_id: z.string(),
      joined_at: z.date(),
      left_at: z.date().optional(),
      consent_given: z.boolean(),
      consent_timestamp: z.date().optional(),
    })
  ),
  start_time: z.date(),
  end_time: z.date().optional(),
  duration_seconds: z.number().optional(),
  quality_metrics: z
    .object({
      avg_bitrate: z.number().optional(),
      packet_loss: z.number().optional(),
      jitter: z.number().optional(),
      resolution: z.string().optional(),
    })
    .optional(),
  consent_status: z.enum(['pending', 'all_consented', 'partial', 'denied']),
  recording_url: z.string().optional(),
  storage_location: z.string().optional(),
  file_size_bytes: z.number().optional(),
  format: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

/**
 * Admin routes for call recording management
 */
const recordingsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * List call recordings
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'List call recordings with optional filters',
        tags: ['admin', 'recordings'],
        querystring: GetRecordingsQuerySchema,
        response: {
          200: z.object({
            recordings: z.array(RecordingMetadataSchema),
            total: z.number(),
            limit: z.number(),
            offset: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { conversation_id, call_id, start_date, end_date, consent_status, limit, offset } =
        request.query as z.infer<typeof GetRecordingsQuerySchema>;
      const tenantId = request.tenant?.tenant_id;

      if (!tenantId) {
        return reply.code(401).send({ error: 'Tenant not found' });
      }

      try {
        // Build query
        const query: any = { tenant_id: tenantId };

        if (conversation_id) {
          query.conversation_id = conversation_id;
        }

        if (call_id) {
          query.call_id = call_id;
        }

        if (consent_status) {
          query.consent_status = consent_status;
        }

        if (start_date || end_date) {
          query.start_time = {};
          if (start_date) {
            query.start_time.$gte = new Date(start_date);
          }
          if (end_date) {
            query.start_time.$lte = new Date(end_date);
          }
        }

        // Get MongoDB client from fastify instance
        const db = fastify.mongo.client?.db('caas_platform');
        if (!db) {
          return reply.code(500).send({ error: 'Database not available' });
        }

        const collection = db.collection('call_recordings');

        // Get total count
        const total = await collection.countDocuments(query);

        // Get recordings
        const recordings = await collection
          .find(query)
          .sort({ start_time: -1 })
          .skip(offset)
          .limit(limit)
          .toArray();

        return reply.send({
          recordings,
          total,
          limit,
          offset,
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Error fetching recordings');
        return reply.code(500).send({ error: 'Failed to fetch recordings' });
      }
    }
  );

  /**
   * Get specific recording metadata
   */
  fastify.get(
    '/:recording_id',
    {
      schema: {
        description: 'Get specific recording metadata',
        tags: ['admin', 'recordings'],
        params: GetRecordingParamsSchema,
        response: {
          200: RecordingMetadataSchema,
          404: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { recording_id } = request.params as z.infer<typeof GetRecordingParamsSchema>;
      const tenantId = request.tenant?.tenant_id;

      if (!tenantId) {
        return reply.code(401).send({ error: 'Tenant not found' });
      }

      try {
        const db = fastify.mongo.client?.db('caas_platform');
        if (!db) {
          return reply.code(500).send({ error: 'Database not available' });
        }

        const collection = db.collection('call_recordings');
        const recording = await collection.findOne({
          recording_id,
          tenant_id: tenantId,
        });

        if (!recording) {
          return reply.code(404).send({ error: 'Recording not found' });
        }

        return reply.send(recording);
      } catch (error) {
        fastify.log.error({ err: error }, 'Error fetching recording');
        return reply.code(500).send({ error: 'Failed to fetch recording' });
      }
    }
  );

  /**
   * Delete recording metadata (for compliance/GDPR)
   */
  fastify.delete(
    '/:recording_id',
    {
      schema: {
        description: 'Delete recording metadata (compliance/GDPR)',
        tags: ['admin', 'recordings'],
        params: DeleteRecordingParamsSchema,
        response: {
          200: z.object({
            message: z.string(),
            recording_id: z.string(),
          }),
          404: z.object({
            error: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { recording_id } = request.params as z.infer<typeof DeleteRecordingParamsSchema>;
      const tenantId = request.tenant?.tenant_id;

      if (!tenantId) {
        return reply.code(401).send({ error: 'Tenant not found' });
      }

      try {
        const db = fastify.mongo.client?.db('caas_platform');
        if (!db) {
          return reply.code(500).send({ error: 'Database not available' });
        }

        const collection = db.collection('call_recordings');
        const result = await collection.deleteOne({
          recording_id,
          tenant_id: tenantId,
        });

        if (result.deletedCount === 0) {
          return reply.code(404).send({ error: 'Recording not found' });
        }

        // TODO: Also delete actual recording file from storage

        return reply.send({
          message: 'Recording metadata deleted successfully',
          recording_id,
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Error deleting recording');
        return reply.code(500).send({ error: 'Failed to delete recording' });
      }
    }
  );

  /**
   * Get recording statistics
   */
  fastify.get(
    '/stats/summary',
    {
      schema: {
        description: 'Get recording statistics summary',
        tags: ['admin', 'recordings'],
        response: {
          200: z.object({
            total_recordings: z.number(),
            by_consent_status: z.record(z.number()),
            total_duration_seconds: z.number(),
            total_storage_bytes: z.number(),
            recordings_last_30_days: z.number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.tenant?.tenant_id;

      if (!tenantId) {
        return reply.code(401).send({ error: 'Tenant not found' });
      }

      try {
        const db = fastify.mongo.client?.db('caas_platform');
        if (!db) {
          return reply.code(500).send({ error: 'Database not available' });
        }

        const collection = db.collection('call_recordings');

        // Get statistics using aggregation
        const stats = await collection
          .aggregate([
            { $match: { tenant_id: tenantId } },
            {
              $group: {
                _id: null,
                total_recordings: { $sum: 1 },
                total_duration_seconds: { $sum: '$duration_seconds' },
                total_storage_bytes: { $sum: '$file_size_bytes' },
              },
            },
          ])
          .toArray();

        // Get consent status breakdown
        const consentStats = await collection
          .aggregate([
            { $match: { tenant_id: tenantId } },
            {
              $group: {
                _id: '$consent_status',
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        const by_consent_status: Record<string, number> = {};
        consentStats.forEach((stat) => {
          by_consent_status[stat._id] = stat.count;
        });

        // Get recordings in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recordings_last_30_days = await collection.countDocuments({
          tenant_id: tenantId,
          start_time: { $gte: thirtyDaysAgo },
        });

        return reply.send({
          total_recordings: stats[0]?.total_recordings || 0,
          by_consent_status,
          total_duration_seconds: stats[0]?.total_duration_seconds || 0,
          total_storage_bytes: stats[0]?.total_storage_bytes || 0,
          recordings_last_30_days,
        });
      } catch (error) {
        fastify.log.error({ err: error }, 'Error fetching recording stats');
        return reply.code(500).send({ error: 'Failed to fetch recording statistics' });
      }
    }
  );
};

export default recordingsRoutes;
