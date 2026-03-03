/**
 * FDB-DRV-002 — Schema Mapping & Index Strategy
 *
 * Entity-to-provider schema mapping for core chat and identity entities.
 * Indexing strategy per provider for primary read patterns.
 * Data type conversion and precision rules.
 */

import { ProviderId, EntityDomain } from '../types';

/* ─── Entity Field Definitions ─── */

export interface FieldMapping {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  required: boolean;
  indexed: boolean;
  ttlField?: boolean;
}

export interface EntitySchema {
  domain: EntityDomain;
  fields: FieldMapping[];
  partitionKey: string;
  sortKey?: string;
}

/* ─── Core Entity Schemas ─── */

export const ENTITY_SCHEMAS: EntitySchema[] = [
  {
    domain: 'users',
    partitionKey: 'tenantId',
    sortKey: 'id',
    fields: [
      { name: 'id', type: 'string', required: true, indexed: true },
      { name: 'tenantId', type: 'string', required: true, indexed: true },
      { name: 'email', type: 'string', required: true, indexed: true },
      { name: 'displayName', type: 'string', required: false, indexed: false },
      { name: 'status', type: 'string', required: true, indexed: true },
      { name: 'createdAt', type: 'date', required: true, indexed: true },
      { name: 'updatedAt', type: 'date', required: true, indexed: false },
      { name: 'metadata', type: 'object', required: false, indexed: false },
    ],
  },
  {
    domain: 'conversations',
    partitionKey: 'tenantId',
    sortKey: 'id',
    fields: [
      { name: 'id', type: 'string', required: true, indexed: true },
      { name: 'tenantId', type: 'string', required: true, indexed: true },
      { name: 'projectId', type: 'string', required: false, indexed: true },
      { name: 'type', type: 'string', required: true, indexed: true },
      { name: 'participants', type: 'array', required: true, indexed: false },
      { name: 'lastMessageAt', type: 'date', required: false, indexed: true },
      { name: 'createdAt', type: 'date', required: true, indexed: true },
      { name: 'metadata', type: 'object', required: false, indexed: false },
    ],
  },
  {
    domain: 'messages',
    partitionKey: 'conversationId',
    sortKey: 'createdAt',
    fields: [
      { name: 'id', type: 'string', required: true, indexed: true },
      { name: 'conversationId', type: 'string', required: true, indexed: true },
      { name: 'tenantId', type: 'string', required: true, indexed: true },
      { name: 'senderId', type: 'string', required: true, indexed: true },
      { name: 'type', type: 'string', required: true, indexed: true },
      { name: 'body', type: 'string', required: true, indexed: false },
      { name: 'createdAt', type: 'date', required: true, indexed: true },
      { name: 'editedAt', type: 'date', required: false, indexed: false },
      { name: 'deleted', type: 'boolean', required: false, indexed: false },
    ],
  },
  {
    domain: 'settings',
    partitionKey: 'tenantId',
    sortKey: 'key',
    fields: [
      { name: 'key', type: 'string', required: true, indexed: true },
      { name: 'tenantId', type: 'string', required: true, indexed: true },
      { name: 'value', type: 'object', required: true, indexed: false },
      { name: 'updatedAt', type: 'date', required: true, indexed: false },
    ],
  },
  {
    domain: 'audit',
    partitionKey: 'tenantId',
    sortKey: 'timestamp',
    fields: [
      { name: 'id', type: 'string', required: true, indexed: true },
      { name: 'tenantId', type: 'string', required: true, indexed: true },
      { name: 'action', type: 'string', required: true, indexed: true },
      { name: 'actor', type: 'string', required: true, indexed: true },
      { name: 'resource', type: 'string', required: true, indexed: true },
      { name: 'timestamp', type: 'date', required: true, indexed: true },
      { name: 'details', type: 'object', required: false, indexed: false },
      { name: 'ttl', type: 'number', required: false, indexed: false, ttlField: true },
    ],
  },
  {
    domain: 'sessions',
    partitionKey: 'tenantId',
    sortKey: 'id',
    fields: [
      { name: 'id', type: 'string', required: true, indexed: true },
      { name: 'tenantId', type: 'string', required: true, indexed: true },
      { name: 'userId', type: 'string', required: true, indexed: true },
      { name: 'token', type: 'string', required: true, indexed: true },
      { name: 'expiresAt', type: 'date', required: true, indexed: true, ttlField: true },
      { name: 'createdAt', type: 'date', required: true, indexed: false },
    ],
  },
  {
    domain: 'presence',
    partitionKey: 'tenantId',
    sortKey: 'userId',
    fields: [
      { name: 'userId', type: 'string', required: true, indexed: true },
      { name: 'tenantId', type: 'string', required: true, indexed: true },
      { name: 'status', type: 'string', required: true, indexed: true },
      { name: 'lastSeenAt', type: 'date', required: true, indexed: true },
      { name: 'deviceInfo', type: 'object', required: false, indexed: false },
    ],
  },
];

/* ─── Provider Index Strategies ─── */

export interface IndexDefinition {
  name: string;
  fields: Array<{ field: string; direction: 'asc' | 'desc' }>;
  unique?: boolean;
  ttl?: boolean;
}

export interface ProviderIndexStrategy {
  provider: ProviderId;
  domain: EntityDomain;
  indexes: IndexDefinition[];
  notes: string;
}

export function getIndexStrategy(provider: ProviderId, domain: EntityDomain): ProviderIndexStrategy {
  const schema = ENTITY_SCHEMAS.find((s) => s.domain === domain);
  if (!schema) {
    return { provider, domain, indexes: [], notes: `No schema defined for domain ${domain}` };
  }

  const indexedFields = schema.fields.filter((f) => f.indexed);
  const indexes: IndexDefinition[] = [];

  if (provider === 'mongodb') {
    // Compound index on partitionKey + sortKey
    indexes.push({
      name: `${domain}_pk_sk`,
      fields: [
        { field: schema.partitionKey, direction: 'asc' },
        ...(schema.sortKey ? [{ field: schema.sortKey, direction: 'asc' as const }] : []),
      ],
    });
    // Individual indexes for frequently queried fields
    for (const f of indexedFields) {
      if (f.name !== schema.partitionKey && f.name !== schema.sortKey) {
        indexes.push({ name: `${domain}_${f.name}`, fields: [{ field: f.name, direction: 'asc' }] });
      }
    }
  } else if (provider === 'dynamodb') {
    // DynamoDB: partition key + sort key are table-level
    // GSIs for secondary indexed fields
    for (const f of indexedFields) {
      if (f.name !== schema.partitionKey && f.name !== schema.sortKey) {
        indexes.push({
          name: `gsi_${domain}_${f.name}`,
          fields: [{ field: f.name, direction: 'asc' }],
        });
      }
    }
  } else if (provider === 'firestore') {
    // Firestore: composite indexes for compound queries
    indexes.push({
      name: `composite_${domain}`,
      fields: [
        { field: schema.partitionKey, direction: 'asc' },
        ...(schema.sortKey ? [{ field: schema.sortKey, direction: 'desc' as const }] : []),
      ],
    });
  } else if (provider === 'cosmosdb') {
    // Cosmos DB: partition key is at container level, composite indexes via indexing policy
    indexes.push({
      name: `composite_${domain}`,
      fields: indexedFields.map((f) => ({ field: f.name, direction: 'asc' as const })),
    });
  }

  return {
    provider,
    domain,
    indexes,
    notes: `Auto-generated index strategy for ${provider}/${domain}`,
  };
}

/* ─── Type Conversion Rules ─── */

export interface TypeConversion {
  sourceType: string;
  targetType: Record<ProviderId, string>;
  precision: string;
}

export const TYPE_CONVERSIONS: TypeConversion[] = [
  {
    sourceType: 'date',
    targetType: {
      mongodb: 'ISODate',
      dynamodb: 'S (ISO-8601 string)',
      firestore: 'Timestamp',
      cosmosdb: 'string (ISO-8601)',
    },
    precision: 'millisecond',
  },
  {
    sourceType: 'number',
    targetType: {
      mongodb: 'NumberLong / Double',
      dynamodb: 'N',
      firestore: 'number (64-bit float)',
      cosmosdb: 'number (64-bit float)',
    },
    precision: 'IEEE 754 double',
  },
  {
    sourceType: 'boolean',
    targetType: {
      mongodb: 'Boolean',
      dynamodb: 'BOOL',
      firestore: 'boolean',
      cosmosdb: 'boolean',
    },
    precision: 'exact',
  },
  {
    sourceType: 'object',
    targetType: {
      mongodb: 'Object (BSON)',
      dynamodb: 'M (Map)',
      firestore: 'Map',
      cosmosdb: 'Object (JSON)',
    },
    precision: 'structural (nested)',
  },
  {
    sourceType: 'array',
    targetType: {
      mongodb: 'Array',
      dynamodb: 'L (List)',
      firestore: 'Array',
      cosmosdb: 'Array (JSON)',
    },
    precision: 'ordered',
  },
];

export function getSchemaForDomain(domain: EntityDomain): EntitySchema | undefined {
  return ENTITY_SCHEMAS.find((s) => s.domain === domain);
}
