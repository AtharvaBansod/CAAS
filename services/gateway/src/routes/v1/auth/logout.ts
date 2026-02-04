import { FastifyPluginAsync } from 'fastify';
import z from 'zod';
import { tokenService } from '../../../services/token-service';

const logoutSchema = z.object({
  refresh_token: z.string().optional(),
});

const logoutRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/logout', {
    schema: {
      body: logoutSchema,
      tags: ['Auth'],
      description: 'Logout and invalidate tokens',
      response: {
        204: z.null(),
      },
    },
  }, async (request, reply) => {
    const { refresh_token } = request.body as z.infer<typeof logoutSchema>;

    if (refresh_token) {
      await tokenService.revokeRefreshToken(refresh_token);
    }

    // If we had a session store or blacklisted access tokens, we'd handle that here.
    
    reply.status(204).send();
  });
};

export default logoutRoutes;
