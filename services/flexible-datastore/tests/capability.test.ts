/**
 * Tests for FDB-ABS-004: Capability Negotiator
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { getCapabilityNegotiator, resetCapabilityNegotiatorForTest, PROVIDER_CAPABILITIES } from '../src/query';

describe('Capability Negotiator', () => {
  let neg: ReturnType<typeof getCapabilityNegotiator>;
  beforeEach(() => {
    resetCapabilityNegotiatorForTest();
    neg = getCapabilityNegotiator();
  });

  it('should return capabilities for mongodb', () => {
    const result = neg.checkCapabilities('mongodb', ['transactions', 'fullTextSearch']);
    expect(result.supported).toBe(true);
    expect(result.unsupported.length).toBe(0);
  });

  it('should return capabilities for dynamodb', () => {
    const result = neg.checkCapabilities('dynamodb', ['transactions', 'fullTextSearch']);
    expect(result.supported).toBe(false);
    expect(result.unsupported).toContain('fullTextSearch');
  });

  it('should get full capabilities for a provider', () => {
    const caps = neg.getCapabilities('mongodb');
    expect(caps.transactions).toBe(true);
    expect(caps.fullTextSearch).toBe(true);
    expect(caps.maxDocSizeBytes).toBe(16_777_216);
  });

  it('should assert capability throws for unsupported feature', () => {
    expect(() => neg.assertCapability('dynamodb', 'fullTextSearch')).toThrow();
  });

  it('should not throw for supported capability', () => {
    expect(() => neg.assertCapability('mongodb', 'transactions')).not.toThrow();
  });

  it('should negotiate compatible provider', () => {
    const result = neg.negotiate('mongodb', ['transactions', 'batchWrites']);
    expect(result.compatible).toBe(true);
    expect(result.missing.length).toBe(0);
  });

  it('should report missing caps in negotiation', () => {
    const result = neg.negotiate('dynamodb', ['fullTextSearch', 'aggregationPipeline']);
    expect(result.compatible).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('should have capabilities for all 4 providers', () => {
    for (const p of ['mongodb', 'dynamodb', 'firestore', 'cosmosdb'] as const) {
      const caps = PROVIDER_CAPABILITIES[p];
      expect(typeof caps.transactions).toBe('boolean');
      expect(typeof caps.maxBatchSize).toBe('number');
    }
  });
});
