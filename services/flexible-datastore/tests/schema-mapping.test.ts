/**
 * Tests for FDB-DRV-002: Schema Mapping
 */
import { describe, it, expect } from 'vitest';
import { ENTITY_SCHEMAS, getIndexStrategy, getSchemaForDomain, TYPE_CONVERSIONS } from '../src/schema-mapping';

describe('Schema Mapping', () => {
  it('should have schemas for all 7 entity domains', () => {
    const domains = ['users', 'conversations', 'messages', 'settings', 'audit', 'sessions', 'presence'];
    for (const d of domains) {
      const schema = getSchemaForDomain(d as any);
      expect(schema).toBeDefined();
      expect(schema!.domain).toBe(d);
    }
  });

  it('should have fields for each schema', () => {
    for (const schema of ENTITY_SCHEMAS) {
      expect(schema.fields.length).toBeGreaterThan(0);
    }
  });

  it('should generate index strategies for mongodb', () => {
    const strategy = getIndexStrategy('mongodb', 'users');
    expect(strategy.provider).toBe('mongodb');
    expect(strategy.domain).toBe('users');
    expect(strategy.indexes.length).toBeGreaterThan(0);
  });

  it('should generate index strategies for dynamodb', () => {
    const strategy = getIndexStrategy('dynamodb', 'messages');
    expect(strategy.provider).toBe('dynamodb');
    expect(strategy.domain).toBe('messages');
    expect(strategy.indexes.length).toBeGreaterThan(0);
  });

  it('should have type conversions for all providers', () => {
    // TYPE_CONVERSIONS is an array of TypeConversion objects
    expect(TYPE_CONVERSIONS.length).toBeGreaterThan(0);
    for (const tc of TYPE_CONVERSIONS) {
      for (const provider of ['mongodb', 'dynamodb', 'firestore', 'cosmosdb'] as const) {
        expect(tc.targetType[provider]).toBeDefined();
      }
    }
  });

  it('should return undefined for unknown domain', () => {
    expect(getSchemaForDomain('nonexistent' as any)).toBeUndefined();
  });

  it('should generate index strategies for firestore', () => {
    const strategy = getIndexStrategy('firestore', 'conversations');
    expect(strategy.provider).toBe('firestore');
    expect(strategy.domain).toBe('conversations');
    expect(strategy.indexes.length).toBeGreaterThan(0);
  });

  it('should generate index strategies for cosmosdb', () => {
    const strategy = getIndexStrategy('cosmosdb', 'audit');
    expect(strategy.provider).toBe('cosmosdb');
    expect(strategy.domain).toBe('audit');
    expect(strategy.indexes.length).toBeGreaterThan(0);
  });

  it('should have partitionKey and sortKey for each schema', () => {
    for (const schema of ENTITY_SCHEMAS) {
      expect(schema.partitionKey).toBeDefined();
      expect(typeof schema.partitionKey).toBe('string');
      expect(schema.sortKey).toBeDefined();
      expect(typeof schema.sortKey).toBe('string');
    }
  });

  it('should have consistent index strategies across all providers for users', () => {
    const providers = ['mongodb', 'dynamodb', 'firestore', 'cosmosdb'] as const;
    for (const p of providers) {
      const strategy = getIndexStrategy(p, 'users');
      expect(strategy.provider).toBe(p);
      expect(strategy.domain).toBe('users');
      expect(strategy.indexes.length).toBeGreaterThan(0);
    }
  });
});
