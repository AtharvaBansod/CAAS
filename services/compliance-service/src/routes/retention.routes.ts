/**
 * Retention Routes
 * Phase 4.5.1 - Task 03: Service Integration
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RetentionService } from '../services/retention.service';

export async function retentionRoutes(fastify: FastifyInstance) {
  const retentionService = new RetentionService();

  // Create retention policy
  fastify.post('/api/v1/retention/policy', async (request: FastifyRequest, reply: FastifyReply) => {
    const policy = request.body as any;

    if (!policy.tenant_id || !policy.name || !policy.data_type || !policy.retention_days) {
      return reply.code(400).send({ error: 'Missing required fields' });
    }

    try {
      const policy_id = await retentionService.createPolicy(policy);
      return reply.code(201).send({ policy_id });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create retention policy' });
    }
  });

  // Get retention policies
  fastify.get('/api/v1/retention/policy', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenant_id } = request.query as { tenant_id: string };

    if (!tenant_id) {
      return reply.code(400).send({ error: 'Missing tenant_id' });
    }

    try {
      const policies = await retentionService.getTenantPolicies(tenant_id);
      return reply.code(200).send({ policies });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get retention policies' });
    }
  });

  // Execute retention policy
  fastify.post('/api/v1/retention/policy/:policyId/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    const { policyId } = request.params as { policyId: string };

    try {
      const execution_id = await retentionService.executePolicy(policyId);
      return reply.code(202).send({ execution_id, status: 'scheduled' });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to execute retention policy' });
    }
  });

  // Get execution status
  fastify.get('/api/v1/retention/execution/:executionId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { executionId } = request.params as { executionId: string };

    try {
      const execution = await retentionService.getExecution(executionId);
      if (!execution) {
        return reply.code(404).send({ error: 'Execution not found' });
      }
      return reply.code(200).send(execution);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get execution status' });
    }
  });
}
