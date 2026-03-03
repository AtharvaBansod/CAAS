/**
 * FDB-DRV-003 — Provider Test Harness
 *
 * Conformance test suite runner that validates every adapter against the
 * IDatastoreRepository contract.
 */

import { IDatastoreRepository } from '../abstraction';
import { ProviderId, EntityDomain } from '../types';
import { v4 as uuid } from 'uuid';

/* ─── Conformance Result ─── */

export interface ConformanceResult {
  provider: ProviderId;
  domain: EntityDomain;
  passed: number;
  failed: number;
  skipped: number;
  details: ConformanceCase[];
  durationMs: number;
}

export interface ConformanceCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  error?: string;
}

/* ─── Conformance Suite ─── */

export class ProviderConformanceSuite {
  private readonly tenantId: string;
  private readonly projectId: string;

  constructor(
    private readonly provider: ProviderId,
    private readonly domain: EntityDomain,
    private readonly repo: IDatastoreRepository,
  ) {
    this.tenantId = `test-tenant-${uuid().slice(0, 8)}`;
    this.projectId = `test-project-${uuid().slice(0, 8)}`;
  }

  async runAll(): Promise<ConformanceResult> {
    const start = Date.now();
    const cases: ConformanceCase[] = [];

    const tests: Array<{ name: string; fn: () => Promise<void> }> = [
      { name: 'ping', fn: () => this.testPing() },
      { name: 'getCapabilities', fn: () => this.testCapabilities() },
      { name: 'create_and_findById', fn: () => this.testCreateAndFind() },
      { name: 'findOne', fn: () => this.testFindOne() },
      { name: 'findMany_with_filters', fn: () => this.testFindMany() },
      { name: 'count', fn: () => this.testCount() },
      { name: 'exists', fn: () => this.testExists() },
      { name: 'update', fn: () => this.testUpdate() },
      { name: 'updateMany', fn: () => this.testUpdateMany() },
      { name: 'softDelete', fn: () => this.testSoftDelete() },
      { name: 'delete', fn: () => this.testDelete() },
      { name: 'createMany', fn: () => this.testCreateMany() },
      { name: 'pagination', fn: () => this.testPagination() },
      { name: 'idempotency', fn: () => this.testIdempotency() },
      { name: 'tenant_isolation', fn: () => this.testTenantIsolation() },
    ];

    for (const t of tests) {
      const ts = Date.now();
      try {
        await t.fn();
        cases.push({ name: t.name, status: 'passed', durationMs: Date.now() - ts });
      } catch (err: any) {
        cases.push({ name: t.name, status: 'failed', durationMs: Date.now() - ts, error: err.message ?? String(err) });
      }
    }

    return {
      provider: this.provider,
      domain: this.domain,
      passed: cases.filter((c) => c.status === 'passed').length,
      failed: cases.filter((c) => c.status === 'failed').length,
      skipped: cases.filter((c) => c.status === 'skipped').length,
      details: cases,
      durationMs: Date.now() - start,
    };
  }

  /* ─── Individual tests ─── */

  private async testPing(): Promise<void> {
    const result = await this.repo.ping();
    assert(result.ok === true, 'ping must return ok: true');
  }

  private async testCapabilities(): Promise<void> {
    const caps = this.repo.getCapabilities();
    assert(typeof caps.transactions === 'boolean', 'capabilities must include transactions');
    assert(typeof caps.fullTextSearch === 'boolean', 'capabilities must include fullTextSearch');
  }

  private async testCreateAndFind(): Promise<void> {
    const doc = { id: uuid(), name: 'test-create', value: 42 };
    const created = await this.repo.create(doc, { tenantId: this.tenantId, projectId: this.projectId });
    assert(created.id === doc.id, 'created doc must have same id');

    const found = await this.repo.findById(doc.id, { tenantId: this.tenantId, projectId: this.projectId });
    assert(found !== null, 'findById must return created doc');
    assert(found!.name === 'test-create', 'doc fields must match');
  }

  private async testFindOne(): Promise<void> {
    const docId = uuid();
    const tag = `findOne-${docId.slice(0, 6)}`;
    await this.repo.create({ id: docId, tag }, { tenantId: this.tenantId, projectId: this.projectId });
    const result = await this.repo.findOne({ tag }, { tenantId: this.tenantId, projectId: this.projectId });
    assert(result !== null, 'findOne must return a matching doc');
    assert(result!.id === docId, 'findOne must return correct doc');
  }

  private async testFindMany(): Promise<void> {
    const tag = `fm-${uuid().slice(0, 6)}`;
    await this.repo.create({ id: uuid(), tag }, { tenantId: this.tenantId, projectId: this.projectId });
    await this.repo.create({ id: uuid(), tag }, { tenantId: this.tenantId, projectId: this.projectId });

    const result = await this.repo.findMany({ tag }, { tenantId: this.tenantId, projectId: this.projectId });
    assert(result.items.length >= 2, 'findMany must return at least 2 items');
  }

  private async testCount(): Promise<void> {
    const tag = `cnt-${uuid().slice(0, 6)}`;
    await this.repo.create({ id: uuid(), tag }, { tenantId: this.tenantId, projectId: this.projectId });
    const count = await this.repo.count({ tag }, { tenantId: this.tenantId, projectId: this.projectId });
    assert(count >= 1, 'count must be >= 1');
  }

  private async testExists(): Promise<void> {
    const docId = uuid();
    await this.repo.create({ id: docId, n: 1 }, { tenantId: this.tenantId, projectId: this.projectId });
    const exists = await this.repo.exists({ id: docId }, { tenantId: this.tenantId, projectId: this.projectId });
    assert(exists === true, 'exists must return true for created doc');

    const notExists = await this.repo.exists({ id: uuid() }, { tenantId: this.tenantId, projectId: this.projectId });
    assert(notExists === false, 'exists must return false for unknown id');
  }

  private async testUpdate(): Promise<void> {
    const docId = uuid();
    await this.repo.create({ id: docId, v: 1 }, { tenantId: this.tenantId, projectId: this.projectId });
    const updated = await this.repo.update(docId, { v: 2 }, { tenantId: this.tenantId, projectId: this.projectId });
    assert(updated.success === true, 'update must return success');
  }

  private async testUpdateMany(): Promise<void> {
    const tag = `um-${uuid().slice(0, 6)}`;
    await this.repo.create({ id: uuid(), tag, status: 'a' }, { tenantId: this.tenantId, projectId: this.projectId });
    await this.repo.create({ id: uuid(), tag, status: 'a' }, { tenantId: this.tenantId, projectId: this.projectId });

    const result = await this.repo.updateMany(
      { tag },
      { status: 'b' },
      { tenantId: this.tenantId, projectId: this.projectId },
    );
    assert(result.modifiedCount >= 2, 'updateMany must update at least 2 docs');
  }

  private async testSoftDelete(): Promise<void> {
    const docId = uuid();
    await this.repo.create({ id: docId, x: 1 }, { tenantId: this.tenantId, projectId: this.projectId });
    const ok = await this.repo.softDelete(docId, { tenantId: this.tenantId, projectId: this.projectId });
    assert(ok === true, 'softDelete must return true');

    const found = await this.repo.findById(docId, { tenantId: this.tenantId, projectId: this.projectId });
    assert(found === null || found._deleted === true, 'softDeleted doc must be null or marked deleted');
  }

  private async testDelete(): Promise<void> {
    const docId = uuid();
    await this.repo.create({ id: docId, y: 1 }, { tenantId: this.tenantId, projectId: this.projectId });
    const ok = await this.repo.delete(docId, { tenantId: this.tenantId, projectId: this.projectId });
    assert(ok === true, 'delete must return true');

    const found = await this.repo.findById(docId, { tenantId: this.tenantId, projectId: this.projectId });
    assert(found === null, 'deleted doc must be null');
  }

  private async testCreateMany(): Promise<void> {
    const docs = Array.from({ length: 3 }, (_, i) => ({ id: uuid(), batch: true, idx: i }));
    const result = await this.repo.createMany(docs, { tenantId: this.tenantId, projectId: this.projectId });
    assert(result.succeeded.length === 3, 'createMany must return 3 succeeded');
  }

  private async testPagination(): Promise<void> {
    const tag = `pg-${uuid().slice(0, 6)}`;
    for (let i = 0; i < 5; i++) {
      await this.repo.create({ id: uuid(), tag, idx: i }, { tenantId: this.tenantId, projectId: this.projectId });
    }
    const page1 = await this.repo.findMany(
      { tag },
      { tenantId: this.tenantId, projectId: this.projectId, pagination: { limit: 2 } },
    );
    assert(page1.items.length === 2, 'page1 must have 2 items');
    assert(page1.nextCursor !== undefined, 'page1 must have nextCursor');

    const page2 = await this.repo.findMany(
      { tag },
      { tenantId: this.tenantId, projectId: this.projectId, pagination: { limit: 2, cursor: page1.nextCursor } },
    );
    assert(page2.items.length === 2, 'page2 must have 2 items');
  }

  private async testIdempotency(): Promise<void> {
    const key = `idem-${uuid()}`;
    const doc = { id: uuid(), idem: true };
    await this.repo.create(doc, { tenantId: this.tenantId, projectId: this.projectId, idempotencyKey: key });
    const dup = await this.repo.create({ ...doc, id: uuid() }, { tenantId: this.tenantId, projectId: this.projectId, idempotencyKey: key });
    assert(dup.id === doc.id, 'idempotent create must return original doc');
  }

  private async testTenantIsolation(): Promise<void> {
    const otherTenant = `other-${uuid().slice(0, 8)}`;
    const docId = uuid();
    await this.repo.create({ id: docId, secret: true }, { tenantId: this.tenantId, projectId: this.projectId });

    const crossTenantFind = await this.repo.findById(docId, { tenantId: otherTenant, projectId: this.projectId });
    assert(crossTenantFind === null, 'cross-tenant findById must return null');
  }
}

/* ─── helper ─── */
function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}
