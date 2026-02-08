import { Connection } from 'mongoose';
import { IsolationStrategy } from './isolation-strategy.interface';
import { ConnectionManager } from '../../connections/connection-manager';

export class CollectionPerTenantStrategy implements IsolationStrategy {
  async getConnection(tenantId: string): Promise<Connection> {
    return ConnectionManager.getInstance().connect();
  }

  getModelName(originalName: string, tenantId: string): string {
    return `${tenantId}_${originalName}`;
  }
}
