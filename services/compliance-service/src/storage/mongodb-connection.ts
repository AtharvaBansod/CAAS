import { MongoClient, Db } from 'mongodb';
import { config } from '../config/config';

class MongoDBConnection {
  private static instance: MongoDBConnection;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  public static getInstance(): MongoDBConnection {
    if (!MongoDBConnection.instance) {
      MongoDBConnection.instance = new MongoDBConnection();
    }
    return MongoDBConnection.instance;
  }

  public async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    try {
      this.client = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await this.client.connect();
      
      // Extract database name from URI
      const dbName = config.mongodb.uri.split('/').pop()?.split('?')[0] || 'caas_compliance';
      this.db = this.client.db(dbName);

      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  public getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.db;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('MongoDB disconnected');
    }
  }

  public async ping(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}

export const mongoConnection = MongoDBConnection.getInstance();
