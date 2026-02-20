/**
 * User Routes
 */

import { FastifyInstance } from 'fastify';
import { UserController } from '../controllers/user.controller';

export async function userRoutes(server: FastifyInstance) {
  const userController = new UserController();

  // Get user profile
  server.get('/profile', {
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
    },
  }, userController.getProfile.bind(userController));

  // Update user profile
  server.put('/profile', {
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          preferences: { type: 'object' },
        },
      },
    },
  }, userController.updateProfile.bind(userController));
}
