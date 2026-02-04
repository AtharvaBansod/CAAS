import { FastifyInstance, FastifySchema, RouteHandlerMethod, HTTPMethods } from 'fastify';
import { ZodSchema } from 'zod';

export interface RouteDefinition {
  method: HTTPMethods;
  url: string;
  handler: RouteHandlerMethod;
  schema?: FastifySchema;
  auth?: boolean;
  permission?: string;
  version?: string;
}

export class RouteFactory {
  static createRoutes(app: FastifyInstance, routes: RouteDefinition[]) {
    routes.forEach(route => {
      app.route({
        method: route.method,
        url: route.url,
        handler: route.handler,
        schema: route.schema,
        // We can add hooks here based on auth/permission flags
        preHandler: async (request, reply) => {
          if (route.auth) {
             // Auth check is handled by global guard or specific guard
             // If we wanted to enforce it here, we could.
          }
        }
      });
    });
  }
}
