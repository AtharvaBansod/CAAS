# Phase 1 Infrastructure V2 - Integration Checklist

This checklist ensures all implemented components are properly integrated and connected.

## Status Legend
- ✅ Complete
- 🔄 In Progress
- ⏳ Pending
- ❌ Blocked

---

## Gateway Service Integration

### Authorization (GATEWAY-V2-001, GATEWAY-V2-002)

#### Files Created ✅
- [x] `services/gateway/src/middleware/authorization/permission-matrix.ts`
- [x] `services/gateway/src/middleware/authorization/conversation-membership-cache.ts`
- [x] `services/gateway/src/decorators/require-permission.ts`
- [x] `services/gateway/src/decorators/require-conversation-member.ts`
- [x] `services/gateway/src/decorators/require-ownership.ts`
- [x] `services/gateway/src/decorators/index.ts`

#### Files Modified ⏳
- [ ] `services/gateway/src/middleware/authorization/authz-enforcer.ts` - ✅ Code updated, needs integration testing
- [ ] `services/gateway/src/middleware/authorization/authz-middleware.ts` - ⏳ Needs permissive mode comment removal
- [ ] `services/gateway/src/routes/v1/conversations/index.ts` - ⏳ Apply decorators
- [ ] `services/gateway/src/routes/v1/conversations/members.ts` - ⏳ Apply decorators
- [ ] `services/gateway/src/routes/v1/messages/index.ts` - ⏳ Apply decorators

#### Integration Steps
1. **Initialize Redis Client for Membership Cache**
   ```typescript
   // In services/gateway/src/main.ts or app.ts
   import { Redis } from 'ioredis';
   import { ConversationMembershipCache } from './middleware/authorization/conversation-membership-cache';
   
   const redis = new Redis({
     host: process.env.REDIS_HOST || 'redis',
     port: parseInt(process.env.REDIS_PORT || '6379'),
     password: process.env.REDIS_PASSWORD,
   });
   
   const membershipCache = new ConversationMembershipCache(redis);
   // Make available to enforcer
   ```

2. **Update Authorization Middleware**
   - Remove "permissive mode" comments
   - Ensure all protected routes use authzMiddleware

3. **Apply Decorators to Routes**
   - Add `@RequirePermission` to conversation and message routes
   - Add `@RequireConversationMember` where needed
   - Add `@RequireOwnership` for update/delete operations

---

### Health & Metrics (GATEWAY-V2-004, GATEWAY-V2-005, GATEWAY-V2-006)

#### Files Created ✅
- [x] `services/gateway/src/services/health-check.ts`
- [x] `services/gateway/src/routes/internal/health.ts`
- [x] `services/gateway/src/routes/internal/index.ts`
- [x] `services/gateway/src/services/metrics.ts`
- [x] `services/gateway/src/plugins/metrics.ts`
- [x] `services/gateway/src/routes/internal/metrics.ts`
- [x] `services/gateway/src/services/shutdown-manager.ts`

#### Files to Modify ⏳
- [ ] `services/gateway/src/main.ts` - Integrate health, metrics, shutdown
- [ ] `services/gateway/src/routes/index.ts` - Register internal routes
- [ ] `services/gateway/src/config/index.ts` - Add health/metrics config
- [ ] `services/gateway/package.json` - Add prom-client dependency
- [ ] `docker-compose.yml` - Expose port 3001 for metrics

#### Integration Steps
1. **Install Dependencies**
   ```bash
   cd services/gateway
   npm install prom-client
   ```

2. **Update main.ts**
   ```typescript
   import { healthCheckService } from './services/health-check';
   import { metricsService } from './services/metrics';
   import metricsPlugin from './plugins/metrics';
   import { shutdownManager } from './services/shutdown-manager';
   import { internalRoutes } from './routes/internal';
   
   // Set clients for health check
   healthCheckService.setMongoClient(mongoClient);
   healthCheckService.setRedisClient(redisClient);
   healthCheckService.setKafkaClient(kafkaClient);
   
   // Register metrics plugin
   await fastify.register(metricsPlugin);
   
   // Register internal routes
   await fastify.register(internalRoutes);
   
   // Setup graceful shutdown
   shutdownManager.setupSignalHandlers(() => {
     fastify.close();
   });
   
   // Track requests for shutdown
   fastify.addHook('onRequest', async () => {
     shutdownManager.incrementRequests();
   });
   
   fastify.addHook('onResponse', async () => {
     shutdownManager.decrementRequests();
   });
   
   // Register shutdown callbacks
   shutdownManager.onShutdown(async () => {
     await mongoClient.close();
     await redisClient.quit();
     await kafkaClient.disconnect();
   });
   ```

3. **Update docker-compose.yml**
   ```yaml
   gateway:
     ports:
       - "3000:3000"
       - "3001:3001"  # Metrics port
     environment:
       - METRICS_PORT=3001
       - HEALTH_CHECK_TIMEOUT_MS=5000
       - SHUTDOWN_TIMEOUT_MS=30000
   ```

4. **Update Health Routes During Shutdown**
   ```typescript
   // In services/gateway/src/routes/internal/health.ts
   import { shutdownManager } from '../../services/shutdown-manager';
   
   // In /ready endpoint
   if (shutdownManager.isShutdown()) {
     return reply.code(503).send({ status: 'shutting_down' });
   }
   ```

---

### Testing (GATEWAY-V2-003, GATEWAY-V2-007)

#### Files to Create ⏳
- [ ] `services/gateway/tests/integration/authorization.test.ts`
- [ ] `services/gateway/tests/integration/health.test.ts`
- [ ] `services/gateway/tests/integration/metrics.test.ts`
- [ ] `services/gateway/tests/fixtures/conversations.ts`
- [ ] `services/gateway/tests/fixtures/users.ts`
- [ ] `services/gateway/tests/fixtures/tokens.ts`
- [ ] `services/gateway/tests/setup.ts`
- [ ] `services/gateway/tests/teardown.ts`
- [ ] `services/gateway/docker-compose.test.yml`

#### Integration Steps
1. **Create Test Infrastructure**
   - Setup test MongoDB and Redis containers
   - Create test fixtures for users, conversations, tokens
   - Setup/teardown scripts for test environment

2. **Add Test Scripts to package.json**
   ```json
   {
     "scripts": {
       "test:auth": "vitest run tests/integration/authorization.test.ts",
       "test:health": "vitest run tests/integration/health.test.ts",
       "test:metrics": "vitest run tests/integration/metrics.test.ts",
       "test:integration": "vitest run tests/integration"
     }
   }
   ```

---

## Kafka Service Integration

### Pipeline Stages (KAFKA-V2-001)

#### Files Created ✅
- [x] `services/kafka-service/src/pipeline/types.ts`
- [x] `services/kafka-service/src/pipeline/stages/tenant-context-stage.ts`
- [x] `services/kafka-service/src/pipeline/stages/authorization-stage.ts`
- [x] `services/kafka-service/src/pipeline/stages/transformation-stage.ts`
- [x] `services/kafka-service/src/pipeline/stages/persistence-stage.ts`
- [x] `services/kafka-service/src/pipeline/stages/notification-stage.ts`
- [x] `services/kafka-service/src/pipeline/stages/metrics-stage.ts`

#### Files to Modify ⏳
- [ ] `services/kafka-service/src/pipeline/stages/deserialization-stage.ts` - Update to use new types
- [ ] `services/kafka-service/src/pipeline/stages/validation-stage.ts` - Update to use new types
- [ ] `services/kafka-service/src/pipeline/stages/processing-stage.ts` - Update to use new types
- [ ] `services/kafka-service/src/pipeline/index.ts` - Export all stages

#### Integration Steps
1. **Update Pipeline Index**
   ```typescript
   // services/kafka-service/src/pipeline/index.ts
   export { PipelineStage, PipelineContext } from './types';
   export { TenantContextStage } from './stages/tenant-context-stage';
   export { AuthorizationStage } from './stages/authorization-stage';
   export { TransformationStage } from './stages/transformation-stage';
   export { PersistenceStage } from './stages/persistence-stage';
   export { NotificationStage } from './stages/notification-stage';
   export { MetricsStage } from './stages/metrics-stage';
   ```

2. **Update Existing Stages to Use New Types**
   - Import `PipelineStage` and `PipelineContext` from `./types`
   - Update method signatures to match interface

---

### Message Persistence (KAFKA-V2-002)

#### Files Created ✅
- [x] `services/kafka-service/src/persistence/message-repository.ts`
- [x] `services/kafka-service/src/persistence/conversation-repository.ts`
- [x] `services/kafka-service/src/persistence/index.ts`

#### Files to Create ⏳
- [ ] `services/kafka-service/src/consumers/message-consumer.ts`

#### Files to Modify ⏳
- [ ] `services/kafka-service/src/consumers/consumer-handlers/message-handler.ts`
- [ ] `services/kafka-service/src/index.ts` - Start message consumer

#### Integration Steps
1. **Create Message Consumer**
   ```typescript
   // services/kafka-service/src/consumers/message-consumer.ts
   import { Consumer } from 'kafkajs';
   import { TenantContextStage } from '../pipeline/stages/tenant-context-stage';
   import { AuthorizationStage } from '../pipeline/stages/authorization-stage';
   import { TransformationStage } from '../pipeline/stages/transformation-stage';
   import { PersistenceStage } from '../pipeline/stages/persistence-stage';
   import { NotificationStage } from '../pipeline/stages/notification-stage';
   import { MetricsStage } from '../pipeline/stages/metrics-stage';
   
   export class MessageConsumer {
     private pipeline: PipelineStage[];
     
     constructor() {
       this.pipeline = [
         new TenantContextStage(),
         new AuthorizationStage(),
         new TransformationStage(),
         new PersistenceStage(),
         new NotificationStage(),
         new MetricsStage(),
       ];
     }
     
     async start() {
       // Subscribe to chat.messages topic
       // Process messages through pipeline
     }
   }
   ```

2. **Initialize MongoDB Clients in Repositories**
   ```typescript
   // In services/kafka-service/src/index.ts
   import { MongoClient } from 'mongodb';
   import { messageRepository, conversationRepository } from './persistence';
   
   const mongoClient = new MongoClient(process.env.MONGODB_URI);
   await mongoClient.connect();
   
   messageRepository.setClient(mongoClient);
   conversationRepository.setClient(mongoClient);
   ```

---

### Dead Letter Queue (KAFKA-V2-003)

#### Files Created ✅
- [x] `services/kafka-service/src/dlq/dlq-processor.ts`
- [x] `services/kafka-service/src/dlq/dlq-retry-service.ts`
- [x] `services/kafka-service/src/dlq/dlq-admin.ts`
- [x] `services/kafka-service/src/dlq/index.ts`
- [x] `services/gateway/src/routes/v1/admin/dlq.ts`

#### Files to Modify ⏳
- [ ] `services/kafka-service/src/errors/dead-letter-queue.ts` - Integrate with new DLQ system
- [ ] `services/gateway/src/routes/v1/admin/index.ts` - Register DLQ routes

#### Integration Steps
1. **Initialize DLQ Services**
   ```typescript
   // In services/kafka-service/src/index.ts
   import { dlqProcessor, dlqRetryService } from './dlq';
   
   dlqProcessor.setClient(mongoClient);
   dlqRetryService.setKafka(kafka);
   
   await dlqRetryService.start();
   ```

2. **Integrate DLQ with Pipeline Error Handling**
   ```typescript
   // In message consumer error handler
   catch (error) {
     await dlqProcessor.storeFailedMessage(
       topic,
       partition,
       offset,
       message,
       error,
       retryCount
     );
   }
   ```

3. **Register DLQ Admin Routes in Gateway**
   ```typescript
   // In services/gateway/src/routes/v1/admin/index.ts
   import { dlqAdminRoutes } from './dlq';
   
   export async function adminRoutes(fastify: FastifyInstance) {
     await fastify.register(dlqAdminRoutes, { prefix: '/admin' });
   }
   ```

---

### Testing (KAFKA-V2-004)

#### Files to Create ⏳
- [ ] `services/kafka-service/tests/integration/consumer.test.ts`
- [ ] `services/kafka-service/tests/integration/pipeline.test.ts`
- [ ] `services/kafka-service/tests/fixtures/messages.ts`
- [ ] `services/kafka-service/tests/fixtures/conversations.ts`
- [ ] `services/kafka-service/tests/utils/kafka-producer.ts`
- [ ] `services/kafka-service/docker-compose.test.yml`

---

## MongoDB Service Integration

### Bulk Operations (MONGO-V2-001)

#### Files Created ✅
- [x] `services/mongodb-service/src/operations/bulk-writer.ts`
- [x] `services/mongodb-service/src/operations/bulk-operations.ts`
- [x] `services/mongodb-service/src/operations/write-concern-config.ts`
- [x] `services/mongodb-service/src/operations/index.ts`

#### Files to Modify ⏳
- [ ] `services/mongodb-service/src/repositories/base.repository.ts` - Add bulk methods

#### Integration Steps
1. **Add Bulk Methods to Base Repository**
   ```typescript
   // In services/mongodb-service/src/repositories/base.repository.ts
   import { BulkWriter } from '../operations/bulk-writer';
   import { WriteConcernPresets } from '../operations/write-concern-config';
   
   export class BaseRepository<T> {
     protected bulkWriter?: BulkWriter<T>;
     
     async bulkInsert(docs: T[]): Promise<void> {
       if (!this.bulkWriter) {
         this.bulkWriter = new BulkWriter(this.collection);
       }
       docs.forEach(doc => this.bulkWriter!.insert(doc));
     }
     
     async bulkUpdate(updates: Array<{filter: any, update: any}>): Promise<void> {
       // Implementation
     }
   }
   ```

2. **Use Bulk Operations in Kafka Persistence Stage**
   ```typescript
   // In services/kafka-service/src/pipeline/stages/persistence-stage.ts
   import { bulkInsertMessages } from '@caas/mongodb-service/operations';
   
   await bulkInsertMessages(collection, this.batchBuffer);
   ```

---

### Change Streams (MONGO-V2-002)

#### Files Created ✅
- [x] `services/mongodb-service/src/change-streams/change-stream-manager.ts`
- [x] `services/mongodb-service/src/change-streams/resume-token-store.ts`
- [x] `services/mongodb-service/src/change-streams/message-change-handler.ts`
- [x] `services/mongodb-service/src/change-streams/conversation-change-handler.ts`
- [x] `services/mongodb-service/src/change-streams/index.ts`

#### Files to Modify ⏳
- [ ] `services/mongodb-service/src/index.ts` - Start change streams

#### Integration Steps
1. **Initialize Change Streams**
   ```typescript
   // In services/mongodb-service/src/index.ts
   import { ChangeStreamManager, ResumeTokenStore, messageChangeHandler, conversationChangeHandler } from './change-streams';
   import { Redis } from 'ioredis';
   
   const redis = new Redis(process.env.REDIS_URI);
   const resumeTokenStore = new ResumeTokenStore();
   resumeTokenStore.setRedis(redis);
   
   const changeStreamManager = new ChangeStreamManager(resumeTokenStore);
   changeStreamManager.setClient(mongoClient);
   
   // Register streams
   changeStreamManager.registerStream(
     'messages',
     { collection: 'messages', fullDocument: 'updateLookup' },
     (change) => messageChangeHandler.handleInsert(change)
   );
   
   changeStreamManager.registerStream(
     'conversations',
     { collection: 'conversations', fullDocument: 'updateLookup' },
     (change) => conversationChangeHandler.handleUpdate(change)
   );
   
   await changeStreamManager.start();
   ```

---

### Connection Resilience (MONGO-V2-003)

#### Files Created ✅
- [x] `services/mongodb-service/src/connections/connection-manager.ts`
- [x] `services/mongodb-service/src/connections/retry-policy.ts`
- [x] `services/mongodb-service/src/connections/circuit-breaker.ts`

#### Files to Modify ⏳
- [ ] `services/mongodb-service/src/connections/connection-factory.ts` - Use connection manager

#### Integration Steps
1. **Use Connection Manager**
   ```typescript
   // In services/mongodb-service/src/connections/connection-factory.ts
   import { ConnectionManager } from './connection-manager';
   import { RetryPolicies } from './retry-policy';
   import { CircuitBreaker } from './circuit-breaker';
   
   const connectionManager = new ConnectionManager({
     uri: process.env.MONGODB_URI,
     retryPolicy: RetryPolicies.STANDARD,
     circuitBreaker: new CircuitBreaker(),
   });
   
   const client = await connectionManager.connect();
   ```

---

### Testing (MONGO-V2-004)

#### Files to Create ⏳
- [ ] `services/mongodb-service/tests/integration/bulk-operations.test.ts`
- [ ] `services/mongodb-service/tests/integration/change-streams.test.ts`
- [ ] `services/mongodb-service/tests/integration/connection-resilience.test.ts`
- [ ] `services/mongodb-service/tests/utils/mongo-helpers.ts`
- [ ] `services/mongodb-service/tests/fixtures/messages.ts`
- [ ] `services/mongodb-service/docker-compose.test.yml`

---

## Environment Variables

### Add to `.env`
```env
# Gateway Authorization
AUTHZ_CACHE_TTL_SECONDS=300
AUTHZ_DEFAULT_DENY=true

# Gateway Health & Metrics
HEALTH_CHECK_TIMEOUT_MS=5000
HEALTH_CHECK_CACHE_TTL_MS=1000
METRICS_PORT=3001
SHUTDOWN_TIMEOUT_MS=30000

# Kafka Pipeline
PIPELINE_STAGE_TIMEOUT_MS=5000
MESSAGE_BATCH_SIZE=100
MESSAGE_FLUSH_INTERVAL_MS=1000

# Kafka DLQ
DLQ_MAX_RETRIES=3
DLQ_RETRY_DELAY_MS=60000

# MongoDB Bulk Operations
BULK_WRITE_BATCH_SIZE=1000
BULK_WRITE_FLUSH_INTERVAL_MS=1000

# MongoDB Change Streams
CHANGE_STREAM_BATCH_SIZE=100
CHANGE_STREAM_MAX_AWAIT_MS=1000

# MongoDB Connection Resilience
MONGO_RETRY_MAX_ATTEMPTS=10
MONGO_RETRY_INITIAL_DELAY_MS=1000
MONGO_CIRCUIT_BREAKER_THRESHOLD=5
```

---

## Summary

### Completed ✅
- All core implementation files created
- Type definitions established
- Service classes implemented
- Repository patterns defined

### Pending Integration ⏳
1. **Gateway Service**
   - Install prom-client dependency
   - Update main.ts with health, metrics, shutdown
   - Apply decorators to routes
   - Remove permissive mode comments

2. **Kafka Service**
   - Create message consumer
   - Update pipeline index exports
   - Initialize DLQ services
   - Connect repositories to MongoDB

3. **MongoDB Service**
   - Add bulk methods to base repository
   - Initialize change streams
   - Use connection manager in factory

4. **Testing**
   - Create all test files
   - Setup test infrastructure
   - Add test scripts to package.json

### Next Actions
1. Run `npm install` in gateway service for prom-client
2. Update main.ts files in all services
3. Create test infrastructure
4. Run integration tests
5. Update docker-compose.yml for metrics port

---

**Co-Authored-By:** Warp <agent@warp.dev>
