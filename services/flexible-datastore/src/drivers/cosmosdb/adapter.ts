/**
 * FDB-DRV-001/002 — Azure Cosmos DB NoSQL Provider Adapter
 *
 * In-memory simulation honoring Cosmos DB constraints:
 * - 2MB doc limit, 100-item batch, partial aggregation
 */

import { IDatastoreRepository, ReadOptions, WriteOptions, RepositoryFactory } from '../../abstraction';
import { EntityDomain, ProviderCapabilities, FilterSpec, SortSpec, PaginationSpec, PaginatedResult, WriteResult, BatchWriteResult, UpdateResult } from '../../types';
import { PROVIDER_CAPABILITIES } from '../../query';
import { v4 as uuid } from 'uuid';

export class CosmosDBAdapter implements IDatastoreRepository {
  readonly domain: EntityDomain;
  private store = new Map<string, Record<string, unknown>>();
  private idempotencyKeys = new Map<string, string>();
  private caps = PROVIDER_CAPABILITIES.cosmosdb;

  constructor(domain: EntityDomain) { this.domain = domain; }

  async findById(id: string, opts?: ReadOptions) {
    const doc = this.store.get(id);
    if (!doc) return null;
    if (opts?.tenantId && doc._tenantId !== opts.tenantId) return null;
    return { ...doc };
  }

  async findOne(filter: FilterSpec, opts?: ReadOptions) {
    for (const doc of this.store.values()) {
      if (opts?.tenantId && doc._tenantId !== opts.tenantId) continue;
      if (this.matchesFilter(doc, filter)) return { ...doc };
    }
    return null;
  }

  async findMany(filter: FilterSpec, opts?: ReadOptions & { sort?: SortSpec[]; pagination?: PaginationSpec }): Promise<PaginatedResult<Record<string, unknown>>> {
    const items: Record<string, unknown>[] = [];
    for (const doc of this.store.values()) {
      if (opts?.tenantId && doc._tenantId !== opts.tenantId) continue;
      if (this.matchesFilter(doc, filter)) items.push({ ...doc });
    }
    const limit = opts?.pagination?.limit ?? 50;
    const offset = opts?.pagination?.cursor ? parseInt(opts.pagination.cursor, 10) : (opts?.pagination?.offset ?? 0);
    const page = items.slice(offset, offset + limit);
    return {
      items: page,
      total: items.length,
      hasMore: offset + limit < items.length,
      nextCursor: offset + limit < items.length ? String(offset + limit) : undefined,
    };
  }

  async count(filter: FilterSpec, opts?: ReadOptions) {
    let n = 0;
    for (const doc of this.store.values()) {
      if (opts?.tenantId && doc._tenantId !== opts.tenantId) continue;
      if (this.matchesFilter(doc, filter)) n++;
    }
    return n;
  }

  async exists(filter: FilterSpec, opts?: ReadOptions) { return (await this.count(filter, opts)) > 0; }

  async create(doc: Record<string, unknown>, opts?: WriteOptions): Promise<WriteResult> {
    if (JSON.stringify(doc).length > this.caps.maxDocSizeBytes)
      throw new Error('Document exceeds Cosmos DB 2MB limit');
    // Idempotency check
    if (opts?.idempotencyKey) {
      const existingId = this.idempotencyKeys.get(opts.idempotencyKey);
      if (existingId) {
        const existing = this.store.get(existingId);
        if (existing) return { id: existingId, success: true, version: existing._version as number };
      }
    }
    const id = (doc.id as string) ?? uuid();
    this.store.set(id, { ...doc, id, _tenantId: opts?.tenantId, _version: 1 });
    if (opts?.idempotencyKey) this.idempotencyKeys.set(opts.idempotencyKey, id);
    return { id, success: true, version: 1 };
  }

  async createMany(docs: Record<string, unknown>[], opts?: WriteOptions): Promise<BatchWriteResult> {
    if (docs.length > this.caps.maxBatchSize) throw new Error(`Batch exceeds Cosmos DB limit of ${this.caps.maxBatchSize}`);
    const succeeded: WriteResult[] = []; const failed: Array<{ id?: string; error: string }> = [];
    for (const doc of docs) { try { succeeded.push(await this.create(doc, opts)); } catch (e: any) { failed.push({ id: doc.id as string, error: e.message }); } }
    return { succeeded, failed };
  }

  async update(id: string, patch: Record<string, unknown>, opts?: WriteOptions): Promise<WriteResult> {
    const existing = this.store.get(id);
    if (!existing) return { id, success: false };
    if (opts?.tenantId && existing._tenantId !== opts.tenantId) return { id, success: false };
    const version = ((existing._version as number) ?? 0) + 1;
    this.store.set(id, { ...existing, ...patch, _version: version });
    return { id, success: true, version };
  }

  async updateMany(filter: FilterSpec, patch: Record<string, unknown>, opts?: WriteOptions): Promise<UpdateResult> {
    let matched = 0, modified = 0;
    for (const [id, doc] of this.store.entries()) {
      if (opts?.tenantId && doc._tenantId !== opts.tenantId) continue;
      if (this.matchesFilter(doc, filter)) { matched++; this.store.set(id, { ...doc, ...patch, _version: ((doc._version as number) ?? 0) + 1 }); modified++; }
    }
    return { matchedCount: matched, modifiedCount: modified };
  }

  async delete(id: string, opts?: WriteOptions) { const d = this.store.get(id); if (!d) return false; if (opts?.tenantId && d._tenantId !== opts.tenantId) return false; return this.store.delete(id); }
  async softDelete(id: string, opts?: WriteOptions) { const d = this.store.get(id); if (!d) return false; if (opts?.tenantId && d._tenantId !== opts.tenantId) return false; d._deleted = true; this.store.set(id, d); return true; }

  getCapabilities(): ProviderCapabilities { return PROVIDER_CAPABILITIES.cosmosdb; }
  async ping() { return { ok: true, latencyMs: 1 }; }

  private matchesFilter(doc: Record<string, unknown>, filter: FilterSpec): boolean {
    for (const [key, val] of Object.entries(filter)) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const op = val as Record<string, unknown>;
        if ('$eq' in op && doc[key] !== op.$eq) return false;
        if ('$ne' in op && doc[key] === op.$ne) return false;
        if ('$in' in op && !(op.$in as unknown[]).includes(doc[key])) return false;
      } else { if (doc[key] !== val) return false; }
    }
    return true;
  }
}

export class CosmosDBAdapterFactory implements RepositoryFactory {
  create(domain: EntityDomain, _config?: Record<string, unknown>): IDatastoreRepository { return new CosmosDBAdapter(domain); }
  capabilities(): ProviderCapabilities { return PROVIDER_CAPABILITIES.cosmosdb; }
}
