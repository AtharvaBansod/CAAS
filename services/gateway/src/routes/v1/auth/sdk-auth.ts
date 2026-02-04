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
    const { app_id, app_secret, user_external_id } = request.body as SdkAuthInput;

    // 1. Verify App Credentials
    // Mock: app_secret must match "secret" for the app_id
    // In real world: lookup app in DB, verify hash
    if (app_secret !== 'secret') { // TODO: Real verification
      throw new UnauthorizedError('Invalid application credentials');
    }

    // 2. Resolve Tenant
    // Assuming app_id maps to tenant
    const tenant = await tenantService.getTenant(app_id); // using app_id as tenant_id lookup for mock
    // Or maybe getTenantByAppId(app_id)
    
    // For now, let's assume valid
    const tenantId = tenant ? tenant.tenant_id : 'default-tenant';

    // 3. Resolve User
    const userId = user_external_id ? `ext:${user_external_id}` : `anon:${crypto.randomUUID()}`;

    // 4. Generate Tokens
    const accessToken = tokenService.generateAccessToken({
      sub: userId,
      tenant_id: tenantId,
      app_id,
    });

    const refreshToken = tokenService.generateRefreshToken(userId);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900, // 15m
      token_type: 'Bearer',
    };
  });
};

export default sdkAuthRoutes;
