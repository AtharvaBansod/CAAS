import { SchemaType } from '@kafkajs/confluent-schema-registry';
import { Schema } from '../registry-client';

export const MESSAGE_ENVELOPE_SCHEMA: Schema = {
  type: SchemaType.JSON,
  subject: 'message-envelope-value',
  schema: JSON.stringify({
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Message Envelope',
    description: 'Standard envelope for all Kafka messages in CAAS platform',
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Unique message identifier (UUID v7 for ordering)',
        pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      },
      type: {
        type: 'string',
        description: 'Event type identifier',
        minLength: 1,
        maxLength: 100
      },
      version: {
        type: 'string',
        description: 'Schema version',
        pattern: '^\\d+\\.\\d+\\.\\d+$'
      },
      timestamp: {
        type: 'integer',
        description: 'Unix timestamp in milliseconds',
        minimum: 0
      },
      tenant_id: {
        type: 'string',
        description: 'Tenant identifier',
        minLength: 1,
        maxLength: 50
      },
      source: {
        type: 'string',
        description: 'Service that produced the message',
        minLength: 1,
        maxLength: 50
      },
      correlation_id: {
        type: ['string', 'null'],
        description: 'Request correlation identifier',
        maxLength: 100
      },
      trace_id: {
        type: ['string', 'null'],
        description: 'Distributed tracing identifier',
        maxLength: 100
      },
      payload: {
        type: 'object',
        description: 'Message payload (type-specific data)',
        additionalProperties: true
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata',
        properties: {
          retry_count: {
            type: ['integer', 'null'],
            description: 'Number of retry attempts',
            minimum: 0
          },
          original_timestamp: {
            type: ['integer', 'null'],
            description: 'Original timestamp for retried messages',
            minimum: 0
          },
          user_agent: {
            type: ['string', 'null'],
            description: 'User agent string',
            maxLength: 500
          },
          ip_address: {
            type: ['string', 'null'],
            description: 'Client IP address',
            maxLength: 45
          },
          user_id: {
            type: ['string', 'null'],
            description: 'User identifier',
            maxLength: 50
          },
          session_id: {
            type: ['string', 'null'],
            description: 'Session identifier',
            maxLength: 100
          }
        },
        additionalProperties: true
      }
    },
    required: [
      'id',
      'type',
      'version',
      'timestamp',
      'tenant_id',
      'source',
      'payload',
      'metadata'
    ],
    additionalProperties: false
  })
};
