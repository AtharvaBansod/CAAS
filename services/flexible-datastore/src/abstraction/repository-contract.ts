/**
 * FDB-ABS-001 — Unified Repository Contract
 *
 * Provider-agnostic repository interfaces for core entities.
 * Service code targets these contracts instead of direct provider SDKs.
 */

import {
  EntityDomain,
  FilterSpec,
  SortSpec,
  PaginationSpec,
  PaginatedResult,
  WriteResult,
  BatchWriteResult,
  UpdateResult,
  ProviderCapabilities,
  ConsistencyMode,
} from '../types';

/* ─── Repository Interface ─── */

export interface IDatastoreRepository {
  readonly domain: EntityDomain;

  /* ── reads ── */
  findById(id: string, opts?: ReadOptions): Promise<Record<string, unknown> | null>;

  findOne(filter: FilterSpec, opts?: ReadOptions): Promise<Record<string, unknown> | null>;

  findMany(
    filter: FilterSpec,
    opts?: ReadOptions & { sort?: SortSpec[]; pagination?: PaginationSpec },
  ): Promise<PaginatedResult<Record<string, unknown>>>;

  count(filter: FilterSpec, opts?: ReadOptions): Promise<number>;

  exists(filter: FilterSpec, opts?: ReadOptions): Promise<boolean>;

  /* ── writes ── */
  create(doc: Record<string, unknown>, opts?: WriteOptions): Promise<WriteResult>;

  createMany(docs: Record<string, unknown>[], opts?: WriteOptions): Promise<BatchWriteResult>;

  update(id: string, patch: Record<string, unknown>, opts?: WriteOptions): Promise<WriteResult>;

  updateMany(filter: FilterSpec, patch: Record<string, unknown>, opts?: WriteOptions): Promise<UpdateResult>;

  delete(id: string, opts?: WriteOptions): Promise<boolean>;

  softDelete(id: string, opts?: WriteOptions): Promise<boolean>;

  /* ── capabilities ── */
  getCapabilities(): ProviderCapabilities;

  /* ── health ── */
  ping(): Promise<{ ok: boolean; latencyMs: number }>;
}

/* ─── Options ─── */

export interface ReadOptions {
  tenantId: string;
  projectId?: string;
  consistency?: ConsistencyMode;
  projection?: string[];
  correlationId?: string;
}

export interface WriteOptions {
  tenantId: string;
  projectId?: string;
  idempotencyKey?: string;
  correlationId?: string;
}

/* ─── Registry ─── */

/**
 * The RepositoryRegistry maps (tenantId, domain) → provider adapter at runtime.
 * Consumers call `getRepository(...)` and receive a provider-agnostic IDatastoreRepository.
 */
export class RepositoryRegistry {
  private factories = new Map<string, RepositoryFactory>();

  register(provider: string, factory: RepositoryFactory): void {
    this.factories.set(provider, factory);
  }

  getFactory(provider: string): RepositoryFactory | undefined {
    return this.factories.get(provider);
  }

  listProviders(): string[] {
    return Array.from(this.factories.keys());
  }
}

export interface RepositoryFactory {
  create(domain: EntityDomain, config?: Record<string, unknown>): IDatastoreRepository;
  capabilities(): ProviderCapabilities;
}

/* ─── Singleton ─── */

let _registry: RepositoryRegistry | undefined;

export function getRepositoryRegistry(): RepositoryRegistry {
  if (!_registry) {
    _registry = new RepositoryRegistry();
  }
  return _registry;
}

export function resetRegistryForTest(): void {
  _registry = undefined;
}
