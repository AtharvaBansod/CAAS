import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Logger } from 'pino';
import { Db } from 'mongodb';

const PreKeyBundleSchema = z.object({
  userId: z.string(),
  identityKey: z.string(),
  signedPreKey: z.object({
    keyId: z.number(),
    publicKey: z.string(),
    signature: z.string(),
  }),
  oneTimePreKeys: z.array(z.object({
    keyId: z.number(),
    publicKey: z.string(),
  })),
});

type PreKeyBundle = z.infer<typeof PreKeyBundleSchema>;

interface PreKeyBundleApiConfig {
  db: Db;
  logger: Logger;
  port: number;
}

export class PreKeyBundleApi {
  private app: FastifyInstance;
  private db: Db;
  private logger: Logger;
  private port: number;

  constructor(config: PreKeyBundleApiConfig) {
    this.db = config.db;
    this.logger = config.logger;
    this.port = config.port;
    this.app = Fastify({ logger: config.logger });
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Get pre-key bundle for user
    this.app.get('/prekey-bundles/:userId', async (
      request: FastifyRequest<{ Params: { userId: string } }>,
      reply: FastifyReply
    ) => {
      const { userId } = request.params;

      try {
        const collection = this.db.collection('prekey_bundles');
        
        // Find bundle with available one-time keys
        const bundle = await collection.findOne({
          userId,
          'oneTimePreKeys.0': { $exists: true }, // Has at least one one-time key
        });

        if (!bundle) {
          return reply.code(404).send({ error: 'Pre-key bundle not found' });
        }

        // Pop one one-time key
        const oneTimeKey = bundle.oneTimePreKeys[0];
        await collection.updateOne(
          { _id: bundle._id },
          { $pull: { oneTimePreKeys: { keyId: oneTimeKey.keyId } } }
        );

        return reply.send({
          userId: bundle.userId,
          identityKey: bundle.identityKey,
          signedPreKey: bundle.signedPreKey,
          oneTimePreKeys: [oneTimeKey],
          timestamp: bundle.timestamp,
        });
      } catch (error) {
        this.logger.error({ error, userId }, 'Failed to get pre-key bundle');
        return reply.code(500).send({ error: 'Internal server error' });
      }
    });

    // Upload pre-key bundle
    this.app.post('/prekey-bundles', async (
      request: FastifyRequest<{ Body: PreKeyBundle }>,
      reply: FastifyReply
    ) => {
      try {
        const bundle = PreKeyBundleSchema.parse(request.body);
        const collection = this.db.collection('prekey_bundles');

        // Upsert bundle
        await collection.updateOne(
          { userId: bundle.userId },
          {
            $set: {
              identityKey: bundle.identityKey,
              signedPreKey: bundle.signedPreKey,
              timestamp: Date.now(),
            },
            $addToSet: {
              oneTimePreKeys: { $each: bundle.oneTimePreKeys },
            },
          },
          { upsert: true }
        );

        this.logger.info({ userId: bundle.userId }, 'Pre-key bundle uploaded');
        return reply.code(201).send({ success: true });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Invalid bundle format', details: error.errors });
        }
        
        this.logger.error({ error }, 'Failed to upload pre-key bundle');
        return reply.code(500).send({ error: 'Internal server error' });
      }
    });

    // Delete used one-time pre-key
    this.app.delete('/prekey-bundles/:bundleId', async (
      request: FastifyRequest<{ Params: { bundleId: string } }>,
      reply: FastifyReply
    ) => {
      const { bundleId } = request.params;

      try {
        // Parse bundleId format: userId:keyId
        const [userId, keyIdStr] = bundleId.split(':');
        const keyId = parseInt(keyIdStr, 10);

        if (!userId || isNaN(keyId)) {
          return reply.code(400).send({ error: 'Invalid bundle ID format' });
        }

        const collection = this.db.collection('prekey_bundles');
        
        await collection.updateOne(
          { userId },
          { $pull: { oneTimePreKeys: { keyId } } }
        );

        this.logger.info({ userId, keyId }, 'One-time pre-key deleted');
        return reply.send({ success: true });
      } catch (error) {
        this.logger.error({ error, bundleId }, 'Failed to delete pre-key');
        return reply.code(500).send({ error: 'Internal server error' });
      }
    });

    // Health check
    this.app.get('/health', async (request, reply) => {
      return reply.send({ status: 'ok', service: 'crypto-service' });
    });
  }

  async start(): Promise<void> {
    try {
      await this.app.listen({ port: this.port, host: '0.0.0.0' });
      this.logger.info({ port: this.port }, 'Pre-key bundle API started');
    } catch (error) {
      this.logger.error({ error }, 'Failed to start pre-key bundle API');
      throw error;
    }
  }

  async stop(): Promise<void> {
    await this.app.close();
    this.logger.info('Pre-key bundle API stopped');
  }
}
