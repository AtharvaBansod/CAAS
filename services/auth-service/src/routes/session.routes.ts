/**
 * Session Routes
 */

import { FastifyInstance } from 'fastify';
import { SessionController } from '../controllers/session.controller';

export async function sessionRoutes(server: FastifyInstance) {
  const sessionController = new SessionController();

  // List user sessions
  server.get('/', {
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
    },
  }, sessionController.listSessions.bind(sessionController));

  // Terminate specific session
  server.delete('/:session_id', {
    schema: {
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' },
        },
      },
      params: {
        type: 'object',
        required: ['session_id'],
        properties: {
          session_id: { type: 'string' },
        },
      },
    },
  }, sessionController.terminateSession.bind(sessionController));
}
