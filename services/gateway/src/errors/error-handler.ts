import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './http-errors';
import { ZodError } from 'zod';

export const globalErrorHandler = (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      status: 'error',
      code: error.code,
      message: error.message,
    });
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: error.errors,
    });
  }

  // Fastify errors
  if ((error as FastifyError).statusCode) {
    const statusCode = (error as FastifyError).statusCode || 500;
    return reply.status(statusCode).send({
      status: 'error',
      code: (error as FastifyError).code || 'INTERNAL_SERVER_ERROR',
      message: error.message,
    });
  }

  return reply.status(500).send({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Something went wrong',
  });
};
