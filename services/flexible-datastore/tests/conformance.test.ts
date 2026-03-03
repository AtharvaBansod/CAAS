/**
 * Tests for FDB-DRV-003: Provider Conformance Suite
 *
 * Runs the ProviderConformanceSuite against each in-memory adapter factory.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderConformanceSuite } from '../src/test-harness';
import { getRepositoryRegistry, resetRegistryForTest } from '../src/abstraction';
import { MongoDBAdapterFactory } from '../src/drivers/mongodb/adapter';
import { DynamoDBAdapterFactory } from '../src/drivers/dynamodb/adapter';
import { FirestoreAdapterFactory } from '../src/drivers/firestore/adapter';
import { CosmosDBAdapterFactory } from '../src/drivers/cosmosdb/adapter';

describe('Conformance Suite', () => {
  beforeEach(() => {
    resetRegistryForTest();
    const registry = getRepositoryRegistry();
    registry.register('mongodb', new MongoDBAdapterFactory());
    registry.register('dynamodb', new DynamoDBAdapterFactory());
    registry.register('firestore', new FirestoreAdapterFactory());
    registry.register('cosmosdb', new CosmosDBAdapterFactory());
  });

  const providers = ['mongodb', 'dynamodb', 'firestore', 'cosmosdb'] as const;

  for (const provider of providers) {
    it(`should run conformance suite for ${provider}`, async () => {
      const registry = getRepositoryRegistry();
      const factory = registry.getFactory(provider);
      expect(factory).toBeDefined();

      const repo = factory!.create('users');
      const suite = new ProviderConformanceSuite(provider, 'users', repo);
      const result = await suite.runAll();

      expect(result.provider).toBe(provider);
      expect(result.domain).toBe('users');

      // Log any failures for debugging
      const failed = result.details.filter(c => c.status === 'failed');
      for (const c of failed) {
        console.error(`[${provider}] ${c.name} FAILED: ${c.error}`);
      }

      expect(result.failed).toBe(0);
      expect(result.passed).toBeGreaterThan(0);
      expect(result.details.length).toBe(15);

      // Log any failures for debugging
      for (const c of result.details) {
        if (c.status === 'failed') {
          console.error(`[${provider}] ${c.name} FAILED: ${c.error}`);
        }
      }
    });
  }

  it('should return null for unknown provider factory', () => {
    const registry = getRepositoryRegistry();
    const factory = registry.getFactory('unknown' as any);
    expect(factory).toBeUndefined();
  });
});
