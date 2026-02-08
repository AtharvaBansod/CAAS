/**
 * Revocation Events Publisher
 * Phase 2 - Authentication - Task AUTH-004
 * 
 * Publishes revocation events to Kafka for distributed cache invalidation
 */

import { Kafka, Producer } from 'kafkajs';
import { RevocationEvent, RevocationReason } from './types';

export class RevocationEventPublisher {
  private producer: Producer;
  private topic: string;

  constructor(kafka: Kafka, topic: string = 'auth.revocation.events') {
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
  async connect(): Promise<void> {
    await this.producer.connect();
  }

  /**
   * Disconnect producer
   */
  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  /**
   * Publish token revoked event
   */
  async publishTokenRevoked(
    tokenId: string,
    userId: string,
    reason: RevocationReason,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: RevocationEvent = {
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
  async publishUserTokensRevoked(
    userId: string,
    reason: RevocationReason,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: RevocationEvent = {
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
  async publishSessionTerminated(
    sessionId: string,
    userId: string,
    reason: RevocationReason,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: RevocationEvent = {
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
  async publishTenantTokensRevoked(
    tenantId: string,
    reason: RevocationReason,
    metadata?: Record<string, any>
  ): Promise<void> {
    const event: RevocationEvent = {
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
  private async publishEvent(event: RevocationEvent): Promise<void> {
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
    } catch (error) {
      console.error('Failed to publish revocation event:', error);
      // Don't throw - revocation should succeed even if event publishing fails
    }
  }

  /**
   * Publish batch of events
   */
  async publishBatch(events: RevocationEvent[]): Promise<void> {
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
    } catch (error) {
      console.error('Failed to publish batch revocation events:', error);
    }
  }
}
