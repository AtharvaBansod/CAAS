/**
 * FDB-ABS-004 — Query Portability & Capability Negotiation
 *
 * Portable query contract subset for core entities.
 * Capability negotiation between abstraction layer and provider adapters.
 * Explicit unsupported-operation signaling.
 */

import { ProviderId, ProviderCapabilities, EntityDomain } from '../types';
import { UnsupportedOperationError } from '../errors';
import { RepositoryFactory, getRepositoryRegistry } from '../abstraction';

/* ─── Portable Query Operations ─── */

export type PortableOp =
  | 'findById'
  | 'findOne'
  | 'findMany'
  | 'count'
  | 'exists'
  | 'create'
  | 'createMany'
  | 'update'
  | 'updateMany'
  | 'delete'
  | 'softDelete';

export const CORE_OPS: PortableOp[] = [
  'findById',
  'findOne',
  'findMany',
  'count',
  'exists',
  'create',
  'createMany',
  'update',
  'updateMany',
  'delete',
  'softDelete',
];

/* ─── Capability Matrix ─── */

export const PROVIDER_CAPABILITIES: Record<ProviderId, ProviderCapabilities> = {
  mongodb: {
    transactions: true,
    ttl: true,
    secondaryIndexes: true,
    batchWrites: true,
    changeStreams: true,
    fullTextSearch: true,
    aggregationPipeline: true,
    atomicCounters: true,
    conditionalWrites: true,
    maxDocSizeBytes: 16_777_216,
    maxBatchSize: 100_000,
  },
  dynamodb: {
    transactions: true,
    ttl: true,
    secondaryIndexes: true,
    batchWrites: true,
    changeStreams: true, // DynamoDB Streams
    fullTextSearch: false,
    aggregationPipeline: false,
    atomicCounters: true,
    conditionalWrites: true,
    maxDocSizeBytes: 400_000,
    maxBatchSize: 25,
  },
  firestore: {
    transactions: true,
    ttl: true,
    secondaryIndexes: true,
    batchWrites: true,
    changeStreams: true,  // onSnapshot
    fullTextSearch: false,
    aggregationPipeline: false,
    atomicCounters: true,
    conditionalWrites: true,
    maxDocSizeBytes: 1_048_576,
    maxBatchSize: 500,
  },
  cosmosdb: {
    transactions: true,       // within partition
    ttl: true,
    secondaryIndexes: true,
    batchWrites: true,
    changeStreams: true,       // change feed
    fullTextSearch: false,
    aggregationPipeline: true, // partial, via MongoDB API
    atomicCounters: true,
    conditionalWrites: true,
    maxDocSizeBytes: 2_097_152,
    maxBatchSize: 100,
  },
};

/* ─── Capability Negotiator ─── */

export class CapabilityNegotiator {
  /**
   * Check if the provider supports a specific set of capabilities.
   * Returns list of unsupported capabilities.
   */
  checkCapabilities(
    provider: ProviderId,
    required: (keyof ProviderCapabilities)[],
  ): { supported: boolean; unsupported: string[] } {
    const caps = PROVIDER_CAPABILITIES[provider];
    const unsupported: string[] = [];

    for (const cap of required) {
      const val = caps[cap];
      if (typeof val === 'boolean' && !val) {
        unsupported.push(cap);
      }
    }

    return { supported: unsupported.length === 0, unsupported };
  }

  /**
   * Validate that a provider can handle the requested operation.
   * Throws UnsupportedOperationError if not.
   */
  assertCapability(provider: ProviderId, capability: keyof ProviderCapabilities): void {
    const caps = PROVIDER_CAPABILITIES[provider];
    const val = caps[capability];
    if (typeof val === 'boolean' && !val) {
      throw new UnsupportedOperationError(provider, capability);
    }
  }

  /**
   * Get the full capability matrix for a provider.
   */
  getCapabilities(provider: ProviderId): ProviderCapabilities {
    return { ...PROVIDER_CAPABILITIES[provider] };
  }

  /**
   * Negotiate at startup: compare required capabilities to provider's reported capabilities.
   * Returns a compatibility report.
   */
  negotiate(
    provider: ProviderId,
    requiredCaps: (keyof ProviderCapabilities)[],
  ): CompatibilityReport {
    const caps = PROVIDER_CAPABILITIES[provider];
    const missing: string[] = [];
    const available: string[] = [];

    for (const cap of requiredCaps) {
      const val = caps[cap];
      if (typeof val === 'boolean') {
        if (val) available.push(cap);
        else missing.push(cap);
      } else {
        available.push(cap);
      }
    }

    return {
      provider,
      compatible: missing.length === 0,
      available,
      missing,
      fallbackSuggestions: missing.map((m) => ({
        capability: m,
        suggestion: `Use internal MongoDB for operations requiring ${m}`,
      })),
    };
  }
}

export interface CompatibilityReport {
  provider: ProviderId;
  compatible: boolean;
  available: string[];
  missing: string[];
  fallbackSuggestions: Array<{ capability: string; suggestion: string }>;
}

/* ─── Portability Test Matrix ─── */

export interface PortabilityTestResult {
  provider: ProviderId;
  domain: EntityDomain;
  operation: PortableOp;
  passed: boolean;
  error?: string;
  latencyMs: number;
}

/* ─── Singleton ─── */

let _negotiator: CapabilityNegotiator | undefined;

export function getCapabilityNegotiator(): CapabilityNegotiator {
  if (!_negotiator) _negotiator = new CapabilityNegotiator();
  return _negotiator;
}

export function resetCapabilityNegotiatorForTest(): void {
  _negotiator = undefined;
}
