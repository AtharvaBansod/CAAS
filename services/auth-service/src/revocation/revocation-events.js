"use strict";
/**
 * Revocation Events Publisher
 * Phase 2 - Authentication - Task AUTH-004
 *
 * Publishes revocation events to Kafka for distributed cache invalidation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevocationEventPublisher = void 0;
class RevocationEventPublisher {
    producer;
    topic;
    constructor(kafka, topic = 'auth.revocation.events') {
        this.producer = kafka.producer({
            idempotent: true,
            maxInFlightRequests: 5,
            transactionalId: 'auth-revocation-producer',
        });
        this.topic = topic;
    }
    /**
     * Initialize producer
     */
    async connect() {
        await this.producer.connect();
    }
    /**
     * Disconnect producer
     */
    async disconnect() {
        await this.producer.disconnect();
    }
    /**
     * Publish token revoked event
     */
    async publishTokenRevoked(tokenId, userId, reason, metadata) {
        const event = {
            event_type: 'token.revoked',
            timestamp: Date.now(),
            reason,
            metadata: {
                token_id: tokenId,
                user_id: userId,
                ...metadata,
            },
        };
        await this.publishEvent(event);
    }
    /**
     * Publish user tokens revoked event
     */
    async publishUserTokensRevoked(userId, reason, metadata) {
        const event = {
            event_type: 'user.tokens.revoked',
            timestamp: Date.now(),
            reason,
            metadata: {
                user_id: userId,
                ...metadata,
            },
        };
        await this.publishEvent(event);
    }
    /**
     * Publish session terminated event
     */
    async publishSessionTerminated(sessionId, userId, reason, metadata) {
        const event = {
            event_type: 'session.terminated',
            timestamp: Date.now(),
            reason,
            metadata: {
                session_id: sessionId,
                user_id: userId,
                ...metadata,
            },
        };
        await this.publishEvent(event);
    }
    /**
     * Publish tenant tokens revoked event
     */
    async publishTenantTokensRevoked(tenantId, reason, metadata) {
        const event = {
            event_type: 'tenant.tokens.revoked',
            timestamp: Date.now(),
            reason,
            metadata: {
                tenant_id: tenantId,
                ...metadata,
            },
        };
        await this.publishEvent(event);
    }
    /**
     * Publish event to Kafka
     */
    async publishEvent(event) {
        try {
            await this.producer.send({
                topic: this.topic,
                messages: [
                    {
                        key: event.metadata.user_id || event.metadata.tenant_id || 'system',
                        value: JSON.stringify(event),
                        timestamp: event.timestamp.toString(),
                        headers: {
                            'event-type': event.event_type,
                            'reason': event.reason,
                        },
                    },
                ],
            });
            console.log('Revocation event published:', {
                type: event.event_type,
                reason: event.reason,
                timestamp: new Date(event.timestamp).toISOString(),
            });
        }
        catch (error) {
            console.error('Failed to publish revocation event:', error);
            // Don't throw - revocation should succeed even if event publishing fails
        }
    }
    /**
     * Publish batch of events
     */
    async publishBatch(events) {
        try {
            const messages = events.map(event => ({
                key: event.metadata.user_id || event.metadata.tenant_id || 'system',
                value: JSON.stringify(event),
                timestamp: event.timestamp.toString(),
                headers: {
                    'event-type': event.event_type,
                    'reason': event.reason,
                },
            }));
            await this.producer.send({
                topic: this.topic,
                messages,
            });
            console.log(`Published ${events.length} revocation events`);
        }
        catch (error) {
            console.error('Failed to publish batch revocation events:', error);
        }
    }
}
exports.RevocationEventPublisher = RevocationEventPublisher;
//# sourceMappingURL=revocation-events.js.map