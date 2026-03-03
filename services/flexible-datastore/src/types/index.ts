/**
 * Flexible Datastore - Core Types
 *
 * Provider-agnostic type definitions for the data access abstraction layer.
 */

/* ─── Provider Identifiers ─── */

export type ProviderId = 'mongodb' | 'dynamodb' | 'firestore' | 'cosmosdb';

export const ALL_PROVIDERS: ProviderId[] = ['mongodb', 'dynamodb', 'firestore', 'cosmosdb'];

/* ─── Entity Domains ─── */

export type EntityDomain =
  | 'users'
  | 'conversations'
  | 'messages'
  | 'settings'
  | 'audit'
  | 'sessions'
  | 'presence';

/* ─── Capability Flags ─── */

export interface ProviderCapabilities {
  transactions: boolean;
  ttl: boolean;
  secondaryIndexes: boolean;
  batchWrites: boolean;
  changeStreams: boolean;
  fullTextSearch: boolean;
  aggregationPipeline: boolean;
  atomicCounters: boolean;
  conditionalWrites: boolean;
  maxDocSizeBytes: number;
  maxBatchSize: number;
}

/* ─── Consistency Modes ─── */

export type ConsistencyMode = 'strong' | 'eventual' | 'cached';

/* ─── Sort / Filter / Pagination ─── */

export interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationSpec {
  limit: number;
  cursor?: string;
  offset?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
  hasMore: boolean;
}

/* ─── Filter Operators ─── */

export type FilterOperator =
  | { $eq: unknown }
  | { $ne: unknown }
  | { $gt: unknown }
  | { $gte: unknown }
  | { $lt: unknown }
  | { $lte: unknown }
  | { $in: unknown[] }
  | { $nin: unknown[] }
  | { $exists: boolean }
  | { $regex: string };

export type FilterSpec = Record<string, unknown | FilterOperator>;

/* ─── Write Results ─── */

export interface WriteResult {
  id: string;
  success: boolean;
  version?: number;
}

export interface BatchWriteResult {
  succeeded: WriteResult[];
  failed: Array<{ id?: string; error: string }>;
}

export interface UpdateResult {
  matchedCount: number;
  modifiedCount: number;
}

/* ─── Provider Health ─── */

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ProviderHealthReport {
  provider: ProviderId;
  status: ProviderHealthStatus;
  latencyMs: number;
  checkedAt: string;
  details?: Record<string, unknown>;
}

/* ─── Routing Decision ─── */

export interface RoutingDecision {
  targetProvider: ProviderId;
  tenantId: string;
  projectId?: string;
  entityDomain: EntityDomain;
  consistencyMode: ConsistencyMode;
  reason: string;
  decidedAt: string;
  correlationId: string;
}

/* ─── Tenant Datastore Profile ─── */

export type ProfileStatus = 'draft' | 'validating' | 'active' | 'inactive' | 'failed';

export type AuthMode = 'connection_string' | 'iam_role' | 'service_account' | 'access_key';

export type EncryptionMode = 'provider_managed' | 'customer_managed_key' | 'platform_envelope';

export interface DatastoreProfile {
  id: string;
  tenantId: string;
  projectId?: string;
  provider: ProviderId;
  region: string;
  endpoint: string;
  authMode: AuthMode;
  encryptionMode: EncryptionMode;
  allowedDomains: EntityDomain[];
  status: ProfileStatus;
  preflightResult?: PreflightResult;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
  createdBy: string;
}

/* ─── Preflight Validation ─── */

export interface PreflightResult {
  connectivity: boolean;
  authentication: boolean;
  schemaReady: boolean;
  latencyMs: number;
  passed: boolean;
  checkedAt: string;
  errors: string[];
}

/* ─── Credential Record ─── */

export interface CredentialRecord {
  id: string;
  profileId: string;
  tenantId: string;
  provider: ProviderId;
  authMode: AuthMode;
  encryptedPayload: string;   // never plaintext
  expiresAt?: string;
  rotatedAt?: string;
  createdAt: string;
  version: number;
}

/* ─── Migration ─── */

export type MigrationStatus =
  | 'pending'
  | 'dual_write'
  | 'verification'
  | 'cutover'
  | 'completed'
  | 'rolled_back';

export interface MigrationPlan {
  id: string;
  tenantId: string;
  sourceProvider: ProviderId;
  targetProvider: ProviderId;
  domains: EntityDomain[];
  status: MigrationStatus;
  integrityChecksum?: string;
  createdAt: string;
  cutoverAt?: string;
  rollbackDeadline?: string;
}

/* ─── Residency & Legal Hold ─── */

export interface ResidencyPolicy {
  tenantId: string;
  allowedRegions: string[];
  allowedProviders: ProviderId[];
  legalHoldActive: boolean;
  retentionDays?: number;
}

/* ─── Audit Event ─── */

export interface DatastoreAuditEvent {
  id: string;
  timestamp: string;
  tenantId: string;
  projectId?: string;
  actor: string;
  action: string;
  resource: string;
  details: Record<string, unknown>;
  correlationId: string;
  outcome: 'success' | 'failure' | 'denied';
}

/* ─── Guard Profile (cost/throughput) ─── */

export interface GuardProfile {
  provider: ProviderId;
  tier: string;
  maxReadRps: number;
  maxWriteRps: number;
  maxBatchSize: number;
  budgetAlertThreshold?: number;
  throttleOnQuotaExhaustion: boolean;
}
