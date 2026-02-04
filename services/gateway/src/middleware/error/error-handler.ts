import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { AppError, InternalServerError } from '../../errors';
import { ZodError } from 'zod';
import { formatZodError } from '../validation/error-formatter';

export const errorHandler = (
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  request.log.error(error);

  if (error instanceof ZodError) {
    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation Error',
      details: formatZodError(error),
    });
    return;
  }

  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
    });
    return;
  }

  // Handle Fastify standard errors (e.g., 404, 415)
  if ((error as FastifyError).statusCode) {
    const statusCode = (error as FastifyError).statusCode || 500;
    reply.status(statusCode).send({
      statusCode,
      error: (error as FastifyError).code || 'Internal Server Error',
      message: error.message,
    });
    return;
  }

  // Fallback for unhandled errors
  const internalError = new InternalServerError();
  reply.status(500).send({
    statusCode: 500,
    error: internalError.name,
    message: internalError.message, // Or hide details in prod
  });
};
