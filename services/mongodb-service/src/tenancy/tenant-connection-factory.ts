import { Connection } from 'mongoose';
import { IsolationStrategy } from './isolation-strategies/isolation-strategy.interface';
import { SharedCollectionStrategy } from './isolation-strategies/shared-collection.strategy';
import { CollectionPerTenantStrategy } from './isolation-strategies/collection-per-tenant.strategy';
import { DatabasePerTenantStrategy } from './isolation-strategies/database-per-tenant.strategy';

export class TenantConnectionFactory {
  private static instance: TenantConnectionFactory;
  private strategies: Map<string, IsolationStrategy> = new Map();
  private defaultStrategy: IsolationStrategy;

  private constructor() {
    this.strategies.set('shared', new SharedCollectionStrategy());
    this.strategies.set('collection', new CollectionPerTenantStrategy());
    this.strategies.set('database', new DatabasePerTenantStrategy());
    this.defaultStrategy = this.strategies.get('shared')!;
  }

  static getInstance(): TenantConnectionFactory {
    if (!this.instance) {
      this.instance = new TenantConnectionFactory();
    }
    return this.instance;
  }

  async getConnection(tenantId: string): Promise<Connection> {
    const strategy = await this.getStrategyForTenant(tenantId);
    return strategy.getConnection(tenantId);
  }

  async getStrategyForTenant(tenantId: string): Promise<IsolationStrategy> {
    // In real app, look up tenant config from Platform DB (saas_clients)
    // For now, default to shared or env config
    const strategyName = process.env.DEFAULT_ISOLATION_STRATEGY || 'shared';
    return this.strategies.get(strategyName) || this.defaultStrategy;
  }
}
