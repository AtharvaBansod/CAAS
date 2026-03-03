/**
 * FDB-DRV-001/002 — MongoDB Provider Adapter
 *
 * Adapter implementing IDatastoreRepository for the internal MongoDB provider.
 * This is the reference implementation and default fallback.
 */

import {
  IDatastoreRepository,
  ReadOptions,
  WriteOptions,
  RepositoryFactory,
} from '../../abstraction';
import {
  EntityDomain,
  ProviderCapabilities,
  FilterSpec,
  SortSpec,
  PaginationSpec,
  PaginatedResult,
  WriteResult,
  BatchWriteResult,
  UpdateResult,
} from '../../types';
import { PROVIDER_CAPABILITIES } from '../../query';
import { v4 as uuid } from 'uuid';

/* ─── In-memory store simulating MongoDB operations ─── */

export class MongoDBAdapter implements IDatastoreRepository {
  readonly domain: EntityDomain;
  private store = new Map<string, Record<string, unknown>>();
  private idempotencyKeys = new Map<string, string>();

  constructor(domain: EntityDomain) {
    this.domain = domain;
  }

  async findById(id: string, opts?: ReadOptions): Promise<Record<string, unknown> | null> {
    const doc = this.store.get(id);
    if (!doc) return null;
    if (opts?.tenantId && doc._tenantId !== opts.tenantId) return null;
    return this.applyProjection(doc, opts?.projection);
  }

  async findOne(filter: FilterSpec, opts?: ReadOptions): Promise<Record<string, unknown> | null> {
    for (const doc of this.store.values()) {
      if (opts?.tenantId && doc._tenantId !== opts.tenantId) continue;
      if (this.matchesFilter(doc, filter)) {
        return this.applyProjection(doc, opts?.projection);
      }
    }
    return null;
  }

  async findMany(
    filter: FilterSpec,
    opts?: ReadOptions & { sort?: SortSpec[]; pagination?: PaginationSpec },
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    let items: Record<string, unknown>[] = [];
    for (const doc of this.store.values()) {
      if (opts?.tenantId && doc._tenantId !== opts.tenantId) continue;
      if (this.matchesFilter(doc, filter)) {
        items.push(this.applyProjection(doc, opts?.projection)!);
      }
    }

    // Sort
    if (opts?.sort?.length) {
      const s = opts.sort[0];
      items.sort((a, b) => {
        const av = a[s.field] as any;
        const bv = b[s.field] as any;
        return s.direction === 'asc' ? (av > bv ? 1 : -1) : av < bv ? 1 : -1;
      });
    }

    const total = items.length;
    const limit = opts?.pagination?.limit ?? 50;
    const offset = opts?.pagination?.cursor ? parseInt(opts.pagination.cursor, 10) : (opts?.pagination?.offset ?? 0);
    items = items.slice(offset, offset + limit);

    return {
      items,
      total,
      hasMore: offset + limit < total,
      nextCursor: offset + limit < total ? String(offset + limit) : undefined,
    };
  }

  async count(filter: FilterSpec, opts?: ReadOptions): Promise<number> {
    let n = 0;
    for (const doc of this.store.values()) {
      if (opts?.tenantId && doc._tenantId !== opts.tenantId) continue;
      if (this.matchesFilter(doc, filter)) n++;
    }
    return n;
  }

  async exists(filter: FilterSpec, opts?: ReadOptions): Promise<boolean> {
    return (await this.count(filter, opts)) > 0;
  }

  async create(doc: Record<string, unknown>, opts?: WriteOptions): Promise<WriteResult> {
    // Idempotency check
    if (opts?.idempotencyKey) {
      const existingId = this.idempotencyKeys.get(opts.idempotencyKey);
      if (existingId) {
        const existing = this.store.get(existingId);
        if (existing) return { id: existingId, success: true, version: existing._version as number };
      }
    }
    const id = (doc.id as string) ?? uuid();
    const record = {
      ...doc,
      id,
      _tenantId: opts?.tenantId,
      _createdAt: new Date().toISOString(),
      _version: 1,
    };
    this.store.set(id, record);
    if (opts?.idempotencyKey) this.idempotencyKeys.set(opts.idempotencyKey, id);
    return { id, success: true, version: 1 };
  }

  async createMany(docs: Record<string, unknown>[], opts?: WriteOptions): Promise<BatchWriteResult> {
    const succeeded: WriteResult[] = [];
    const failed: Array<{ id?: string; error: string }> = [];
    for (const doc of docs) {
      try {
        const result = await this.create(doc, opts);
        succeeded.push(result);
      } catch (err: any) {
        failed.push({ id: doc.id as string, error: err.message });
      }
    }
    return { succeeded, failed };
  }

  async update(id: string, patch: Record<string, unknown>, opts?: WriteOptions): Promise<WriteResult> {
    const existing = this.store.get(id);
    if (!existing) return { id, success: false };
    if (opts?.tenantId && existing._tenantId !== opts.tenantId) {
      return { id, success: false };
    }
    const version = ((existing._version as number) ?? 0) + 1;
    const updated = { ...existing, ...patch, _version: version, _updatedAt: new Date().toISOString() };
    this.store.set(id, updated);
    return { id, success: true, version };
  }

  async updateMany(
    filter: FilterSpec,
    patch: Record<string, unknown>,
    opts?: WriteOptions,
  ): Promise<UpdateResult> {
    let matched = 0;
    let modified = 0;
    for (const [id, doc] of this.store.entries()) {
      if (opts?.tenantId && doc._tenantId !== opts.tenantId) continue;
      if (this.matchesFilter(doc, filter)) {
        matched++;
        const version = ((doc._version as number) ?? 0) + 1;
        this.store.set(id, { ...doc, ...patch, _version: version, _updatedAt: new Date().toISOString() });
        modified++;
      }
    }
    return { matchedCount: matched, modifiedCount: modified };
  }

  async delete(id: string, opts?: WriteOptions): Promise<boolean> {
    const existing = this.store.get(id);
    if (!existing) return false;
    if (opts?.tenantId && existing._tenantId !== opts.tenantId) return false;
    return this.store.delete(id);
  }

  async softDelete(id: string, opts?: WriteOptions): Promise<boolean> {
    const existing = this.store.get(id);
    if (!existing) return false;
    if (opts?.tenantId && existing._tenantId !== opts.tenantId) return false;
    existing._deleted = true;
    existing._deletedAt = new Date().toISOString();
    this.store.set(id, existing);
    return true;
  }

  getCapabilities(): ProviderCapabilities {
    return PROVIDER_CAPABILITIES.mongodb;
  }

  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    return { ok: true, latencyMs: Date.now() - start };
  }

  /* ── internals ── */

  private matchesFilter(doc: Record<string, unknown>, filter: FilterSpec): boolean {
    for (const [key, val] of Object.entries(filter)) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const op = val as Record<string, unknown>;
        if ('$eq' in op && doc[key] !== op.$eq) return false;
        if ('$ne' in op && doc[key] === op.$ne) return false;
        if ('$gt' in op && !((doc[key] as any) > (op.$gt as any))) return false;
        if ('$gte' in op && !((doc[key] as any) >= (op.$gte as any))) return false;
        if ('$lt' in op && !((doc[key] as any) < (op.$lt as any))) return false;
        if ('$lte' in op && !((doc[key] as any) <= (op.$lte as any))) return false;
        if ('$in' in op && !(op.$in as unknown[]).includes(doc[key])) return false;
        if ('$exists' in op) {
          const exists = key in doc && doc[key] !== undefined;
          if (op.$exists !== exists) return false;
        }
      } else {
        if (doc[key] !== val) return false;
      }
    }
    return true;
  }

  private applyProjection(
    doc: Record<string, unknown>,
    projection?: string[],
  ): Record<string, unknown> {
    if (!projection || projection.length === 0) return { ...doc };
    const result: Record<string, unknown> = { id: doc.id };
    for (const field of projection) {
      if (field in doc) result[field] = doc[field];
    }
    return result;
  }
}

/* ─── Factory ─── */

export class MongoDBAdapterFactory implements RepositoryFactory {
  create(domain: EntityDomain, _config?: Record<string, unknown>): IDatastoreRepository {
    return new MongoDBAdapter(domain);
  }

  capabilities(): ProviderCapabilities {
    return PROVIDER_CAPABILITIES.mongodb;
  }
}
