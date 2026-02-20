/**
 * Error Handler Middleware
 */

import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error({ error, url: request.url, method: request.method }, 'Request error');

  // JWT errors
  if (error.message.includes('jwt') || error.message.includes('token')) {
    return reply.status(401).send({
      error: 'Authentication failed',
      message: error.message,
    });
  }

  // Validation errors
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation failed',
      details: error.validation,
    });
  }

  // Default error
  return reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal server error',
  });
}
