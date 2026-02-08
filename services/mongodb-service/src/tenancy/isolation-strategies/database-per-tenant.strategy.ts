import { Connection } from 'mongoose';
import { IsolationStrategy } from './isolation-strategy.interface';
import mongoose from 'mongoose';
import { getDatabaseConfig, getMongooseOptions } from '../../config';

export class DatabasePerTenantStrategy implements IsolationStrategy {
  private connections: Map<string, Connection> = new Map();

  async getConnection(tenantId: string): Promise<Connection> {
    if (this.connections.has(tenantId)) {
      return this.connections.get(tenantId)!;
    }

    const config = getDatabaseConfig();
    // Replace database name in URI with tenant specific DB
    // Assumes URI format: mongodb://host:port/dbname?options
    const baseUri = config.uri.split('?')[0];
    const options = config.uri.split('?')[1] || '';
    
    // Naive URI manipulation - in prod use a proper parser
    const tenantUri = `${baseUri.substring(0, baseUri.lastIndexOf('/'))}/${tenantId}?${options}`;

    const connection = await mongoose.createConnection(tenantUri, getMongooseOptions()).asPromise();
    this.connections.set(tenantId, connection);
    
    return connection;
  }

  getModelName(originalName: string, tenantId: string): string {
    return originalName; // Same collection name, different DB
  }
}
