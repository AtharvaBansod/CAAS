import { Connection } from 'mongoose';

export interface IsolationStrategy {
  getConnection(tenantId: string): Promise<Connection>;
  getModelName(originalName: string, tenantId: string): string;
}
