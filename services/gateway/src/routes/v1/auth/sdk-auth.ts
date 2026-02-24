import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import { tokenService } from '../../../services/token-service';
import { tenantService } from '../../../services/tenant-service';
import { UnauthorizedError, BadRequestError } from '../../../errors';
import { sdkAuthSchema, tokenResponseSchema, SdkAuthInput } from '../../../schemas/validators/auth';

const sdkAuthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/sdk/token', {
    schema: {
      body: sdkAuthSchema,
      tags: ['Auth'],
      description: 'Authenticate SDK and get tokens',
      response: {
        200: tokenResponseSchema,
      },
    },
  }, async (request, reply) => {
    // Delegate to Auth Service
    const authClient = (request.server as any).authClient;
    if (!authClient) {
      throw new Error('AuthServiceClient not available');
    }

    const { app_id, app_secret, user_external_id } = request.body as SdkAuthInput;

    try {
      // Step 1: Create session in Auth Service
      const authResponse = await authClient.createSdkSession({
        user_external_id,
        // user_data is not in SdkAuthInput, but we can pass empty for now
        // or map from other headers/body if needed
      }, app_secret);

      return authResponse;
    } catch (err: any) {
      request.log.error({ err }, 'Failed to create SDK session via Auth Service');
      throw new UnauthorizedError(err.message || 'Invalid application credentials');
    }
  });
};

export default sdkAuthRoutes;
