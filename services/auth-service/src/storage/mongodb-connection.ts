/**
 * MongoDB Connection Manager - Singleton
 */

import { MongoClient, Db } from 'mongodb';
import { config } from '../config/config';
import pino from 'pino';

const logger = pino({ level: config.logLevel });

class MongoDBConnectionSingleton {
  private static instance: MongoDBConnectionSingleton;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  private constructor() {}

  static getInstance(): MongoDBConnectionSingleton {
    if (!MongoDBConnectionSingleton.instance) {
      MongoDBConnectionSingleton.instance = new MongoDBConnectionSingleton();
    }
    return MongoDBConnectionSingleton.instance;
  }

  async connect(): Promise<void> {
    if (this.client) {
      logger.info('MongoDB already connected');
      return;
    }

    try {
      this.client = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await this.client.connect();
      
      this.db = this.client.db();
      
      logger.info('MongoDB connected successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to connect to MongoDB');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info('MongoDB disconnected');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db;
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('MongoDB client not initialized');
    }
    return this.client;
  }
}

export const MongoDBConnection = MongoDBConnectionSingleton.getInstance();
export { MongoDBConnectionSingleton };
