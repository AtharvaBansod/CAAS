/**
 * API Key Middleware
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Validates x-api-key header and attaches client context to the request
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiKeyService } from '../services/api-key.service';

const apiKeyService = new ApiKeyService();

export async function apiKeyMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
        return reply.status(401).send({
            error: 'API key is required in x-api-key header',
        });
    }

    // IP address of the caller
    const ipAddress = request.ip;

    const result = await apiKeyService.validateApiKey(apiKey, ipAddress);

    if (!result.valid) {
        return reply.status(401).send({
            error: result.error || 'Invalid API key',
        });
    }

    // Attach client context to the request for use in controllers
    (request as any).clientContext = result.client;
}
