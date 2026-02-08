import { Connection } from 'mongoose';
import { IsolationStrategy } from './isolation-strategy.interface';
import { ConnectionManager } from '../../connections/connection-manager';

export class SharedCollectionStrategy implements IsolationStrategy {
  async getConnection(tenantId: string): Promise<Connection> {
    return ConnectionManager.getInstance().connect();
  }

  getModelName(originalName: string, tenantId: string): string {
    return originalName; // Same collection, filtered by tenant_id field
  }
}
