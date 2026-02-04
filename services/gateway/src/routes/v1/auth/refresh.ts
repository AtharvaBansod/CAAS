import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import { tokenService } from '../../../services/token-service';
import { tenantService } from '../../../services/tenant-service';
import { UnauthorizedError } from '../../../errors';

const refreshSchema = z.object({
  refresh_token: z.string(),
});

const refreshRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/refresh', {
    schema: {
      body: refreshSchema,
      tags: ['Auth'],
      description: 'Refresh access token',
      response: {
        200: z.object({
          access_token: z.string(),
          refresh_token: z.string(),
          expires_in: z.number(),
          token_type: z.literal('Bearer'),
        }),
      },
    },
  }, async (request, reply) => {
    const { refresh_token } = request.body as z.infer<typeof refreshSchema>;

    const userId = await tokenService.validateRefreshToken(refresh_token);
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // In a real scenario, we'd fetch the user to get current tenant/scope
    // For now, assume some defaults or store them in refresh token meta
    // We'll regenerate a new refresh token (rotation)
    
    // Mock user fetching
    const tenantId = 'default-tenant'; // Should be from user context
    const appId = 'app-123'; // Should be from user context

    const accessToken = tokenService.generateAccessToken({
      sub: userId,
      tenant_id: tenantId,
      app_id: appId,
    });

    const newRefreshToken = tokenService.generateRefreshToken(userId);

    // Revoke old one (already done by validateRefreshToken in my implementation? 
    // Wait, validateRefreshToken deletes it if expired. 
    // But if valid, we should delete it now to rotate.)
    await tokenService.revokeRefreshToken(refresh_token);

    return {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 900,
      token_type: 'Bearer',
    };
  });
};

export default refreshRoutes;
