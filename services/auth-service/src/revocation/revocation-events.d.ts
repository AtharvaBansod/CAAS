/**
 * Revocation Events Publisher
 * Phase 2 - Authentication - Task AUTH-004
 *
 * Publishes revocation events to Kafka for distributed cache invalidation
 */
import { Kafka } from 'kafkajs';
import { RevocationEvent, RevocationReason } from './types';
export declare class RevocationEventPublisher {
    private producer;
    private topic;
    constructor(kafka: Kafka, topic?: string);
    /**
     * Initialize producer
     */
    connect(): Promise<void>;
    /**
     * Disconnect producer
     */
    disconnect(): Promise<void>;
    /**
     * Publish token revoked event
     */
    publishTokenRevoked(tokenId: string, userId: string, reason: RevocationReason, metadata?: Record<string, any>): Promise<void>;
    /**
     * Publish user tokens revoked event
     */
    publishUserTokensRevoked(userId: string, reason: RevocationReason, metadata?: Record<string, any>): Promise<void>;
    /**
     * Publish session terminated event
     */
    publishSessionTerminated(sessionId: string, userId: string, reason: RevocationReason, metadata?: Record<string, any>): Promise<void>;
    /**
     * Publish tenant tokens revoked event
     */
    publishTenantTokensRevoked(tenantId: string, reason: RevocationReason, metadata?: Record<string, any>): Promise<void>;
    /**
     * Publish event to Kafka
     */
    private publishEvent;
    /**
     * Publish batch of events
     */
    publishBatch(events: RevocationEvent[]): Promise<void>;
}
