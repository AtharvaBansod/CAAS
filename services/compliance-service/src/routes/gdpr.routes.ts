/**
 * GDPR Routes
 * Phase 4.5.1 - Task 03: Service Integration
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { GDPRService } from '../services/gdpr.service';

export async function gdprRoutes(fastify: FastifyInstance) {
  const gdprService = new GDPRService();

  // Record consent
  fastify.post('/api/v1/gdpr/consent', async (request: FastifyRequest, reply: FastifyReply) => {
    const consent = request.body as any;

    if (!consent.user_id || !consent.tenant_id || !consent.consent_type) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    try {
      const consent_id = await gdprService.recordConsent(consent);
      return reply.code(201).send({ consent_id });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to record consent' });
    }
  });

  // Get consent
  fastify.get('/api/v1/gdpr/consent', async (request: FastifyRequest, reply: FastifyReply) => {
    const { user_id, tenant_id, consent_type } = request.query as any;

    if (!user_id || !tenant_id) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    try {
      const consents = await gdprService.getConsent(user_id, tenant_id, consent_type);
      return reply.code(200).send({ consents });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get consent' });
    }
  });

  // Revoke consent
  fastify.delete('/api/v1/gdpr/consent/:consentId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { consentId } = request.params as { consentId: string };

    try {
      await gdprService.revokeConsent(consentId);
      return reply.code(204).send();
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to revoke consent' });
    }
  });

  // Submit GDPR request
  fastify.post('/api/v1/gdpr/request', async (request: FastifyRequest, reply: FastifyReply) => {
    const gdprRequest = request.body as any;

    if (!gdprRequest.user_id || !gdprRequest.tenant_id || !gdprRequest.request_type) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    try {
      const request_id = await gdprService.createRequest(gdprRequest);
      return reply.code(201).send({ request_id });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to submit GDPR request' });
    }
  });

  // Get GDPR request status
  fastify.get('/api/v1/gdpr/request/:requestId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { requestId } = request.params as { requestId: string };

    try {
      const gdprRequest = await gdprService.getRequest(requestId);
      if (!gdprRequest) {
        return reply.code(404).send({ error: 'Request not found' });
      }
      return reply.code(200).send(gdprRequest);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get request status' });
    }
  });
}
