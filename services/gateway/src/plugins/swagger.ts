import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { FastifyPluginAsync } from 'fastify';

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'CAAS API Gateway',
        description: 'API Gateway for CAAS Platform',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: ({ schema, url }) => {
      // Skip routes without schemas or with null schemas
      if (!schema || schema === null) {
        return { schema: {}, url };
      }
      
      // Clean up null values in schema
      const cleanSchema = JSON.parse(JSON.stringify(schema, (key, value) => {
        if (value === null) return undefined;
        return value;
      }));
      
      return { schema: cleanSchema, url };
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
};

export default fp(swaggerPlugin);
