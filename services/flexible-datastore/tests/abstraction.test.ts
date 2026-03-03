/**
 * Tests for FDB-ABS-001: Repository Contract & Registry
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRepositoryRegistry,
  resetRegistryForTest,
  IDatastoreRepository,
  RepositoryFactory,
} from '../src/abstraction';
import { MongoDBAdapterFactory } from '../src/drivers/mongodb/adapter';
import { DynamoDBAdapterFactory } from '../src/drivers/dynamodb/adapter';
import { FirestoreAdapterFactory } from '../src/drivers/firestore/adapter';
import { CosmosDBAdapterFactory } from '../src/drivers/cosmosdb/adapter';

describe('Repository Contract & Registry', () => {
  beforeEach(() => resetRegistryForTest());

  it('should register and retrieve a factory', () => {
    const registry = getRepositoryRegistry();
    const factory = new MongoDBAdapterFactory();
    registry.register('mongodb', factory);
    expect(registry.getFactory('mongodb')).toBe(factory);
  });

  it('should return undefined for unregistered provider', () => {
    const registry = getRepositoryRegistry();
    expect(registry.getFactory('dynamodb')).toBeUndefined();
  });

  it('should list registered providers', () => {
    const registry = getRepositoryRegistry();
    registry.register('mongodb', new MongoDBAdapterFactory());
    registry.register('dynamodb', new DynamoDBAdapterFactory());
    expect(registry.listProviders()).toEqual(expect.arrayContaining(['mongodb', 'dynamodb']));
  });

  describe('MongoDB adapter via factory', () => {
    let repo: IDatastoreRepository;

    beforeEach(() => {
      const factory = new MongoDBAdapterFactory();
      repo = factory.create('users');
    });

    it('should implement ping', async () => {
      const result = await repo.ping();
      expect(result.ok).toBe(true);
    });

    it('should return capabilities', () => {
      const caps = repo.getCapabilities();
      expect(typeof caps.transactions).toBe('boolean');
      expect(typeof caps.fullTextSearch).toBe('boolean');
    });

    it('should create and find a document', async () => {
      const result = await repo.create({ id: 'u1', name: 'Alice' }, { tenantId: 't1', projectId: 'p1' });
      expect(result.id).toBe('u1');
      const found = await repo.findById('u1', { tenantId: 't1', projectId: 'p1' });
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Alice');
    });

    it('should enforce tenant isolation', async () => {
      await repo.create({ id: 'u2', name: 'Bob' }, { tenantId: 't1', projectId: 'p1' });
      const cross = await repo.findById('u2', { tenantId: 't2', projectId: 'p1' });
      expect(cross).toBeNull();
    });

    it('should delete a document', async () => {
      await repo.create({ id: 'u3', val: 1 }, { tenantId: 't1', projectId: 'p1' });
      const ok = await repo.delete('u3', { tenantId: 't1', projectId: 'p1' });
      expect(ok).toBe(true);
      const found = await repo.findById('u3', { tenantId: 't1', projectId: 'p1' });
      expect(found).toBeNull();
    });

    it('should soft delete a document', async () => {
      await repo.create({ id: 'u4', val: 1 }, { tenantId: 't1', projectId: 'p1' });
      const ok = await repo.softDelete('u4', { tenantId: 't1', projectId: 'p1' });
      expect(ok).toBe(true);
      const found = await repo.findById('u4', { tenantId: 't1', projectId: 'p1' });
      // Soft-deleted docs may be returned with _deleted: true, or may be null
      if (found !== null) {
        expect(found._deleted).toBe(true);
      }
    });

    it('should update a document', async () => {
      await repo.create({ id: 'u5', val: 1 }, { tenantId: 't1', projectId: 'p1' });
      const updated = await repo.update('u5', { val: 2 }, { tenantId: 't1', projectId: 'p1' });
      expect(updated.success).toBe(true);
    });

    it('should count documents', async () => {
      await repo.create({ id: 'm1', t: 'cnt' }, { tenantId: 't1', projectId: 'p1' });
      await repo.create({ id: 'm2', t: 'cnt' }, { tenantId: 't1', projectId: 'p1' });
      const count = await repo.count({ t: 'cnt' }, { tenantId: 't1', projectId: 'p1' });
      expect(count).toBe(2);
    });

    it('should check exists', async () => {
      await repo.create({ id: 'eu1' }, { tenantId: 't1', projectId: 'p1' });
      expect(await repo.exists({ id: 'eu1' }, { tenantId: 't1', projectId: 'p1' })).toBe(true);
      expect(await repo.exists({ id: 'none' }, { tenantId: 't1', projectId: 'p1' })).toBe(false);
    });

    it('should support createMany', async () => {
      const docs = [{ id: 'cm1', v: 1 }, { id: 'cm2', v: 2 }, { id: 'cm3', v: 3 }];
      const result = await repo.createMany(docs, { tenantId: 't1', projectId: 'p1' });
      expect(result.succeeded.length).toBe(3);
    });

    it('should support findMany with pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create({ id: `pg${i}`, tag: 'paginate' }, { tenantId: 'tp', projectId: 'p1' });
      }
      const page1 = await repo.findMany({ tag: 'paginate' }, { tenantId: 'tp', projectId: 'p1', pagination: { limit: 2 } });
      expect(page1.items.length).toBe(2);
      expect(page1.nextCursor).toBeDefined();

      const page2 = await repo.findMany({ tag: 'paginate' }, { tenantId: 'tp', projectId: 'p1', pagination: { limit: 2, cursor: page1.nextCursor } });
      expect(page2.items.length).toBe(2);
    });

    it('should support updateMany', async () => {
      await repo.create({ id: 'um1', status: 'a', grp: 'g1' }, { tenantId: 't1', projectId: 'p1' });
      await repo.create({ id: 'um2', status: 'a', grp: 'g1' }, { tenantId: 't1', projectId: 'p1' });
      const result = await repo.updateMany({ grp: 'g1' }, { status: 'b' }, { tenantId: 't1', projectId: 'p1' });
      expect(result.modifiedCount).toBe(2);
    });
  });

  describe('All adapters implement contract', () => {
    const factories: Array<[string, RepositoryFactory]> = [
      ['mongodb', new MongoDBAdapterFactory()],
      ['dynamodb', new DynamoDBAdapterFactory()],
      ['firestore', new FirestoreAdapterFactory()],
      ['cosmosdb', new CosmosDBAdapterFactory()],
    ];

    for (const [name, factory] of factories) {
      it(`${name} adapter should ping`, async () => {
        const repo = factory.create('users');
        const result = await repo.ping();
        expect(result.ok).toBe(true);
      });

      it(`${name} adapter should return capabilities`, () => {
        const repo = factory.create('users');
        const caps = repo.getCapabilities();
        expect(typeof caps.transactions).toBe('boolean');
      });

      it(`${name} adapter should CRUD`, async () => {
        const repo = factory.create('users');
        const d = await repo.create({ id: `${name}-1`, val: 1 }, { tenantId: 'ct', projectId: 'p' });
        expect(d.id).toBe(`${name}-1`);
        const found = await repo.findById(`${name}-1`, { tenantId: 'ct', projectId: 'p' });
        expect(found).not.toBeNull();
      });
    }
  });
});
