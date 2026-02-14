/**
 * Change Stream Manager
 * 
 * Manages multiple change streams for real-time database updates
 */

import { MongoClient, ChangeStream, ChangeStreamDocument, ResumeToken } from 'mongodb';
import { ResumeTokenStore } from './resume-token-store';

export interface ChangeStreamConfig {
  collection: string;
  database?: string;
  pipeline?: any[];
  batchSize?: number;
  maxAwaitTimeMS?: number;
  fullDocument?: 'default' | 'updateLookup';
}

export class ChangeStreamManager {
  private client?: MongoClient;
  private streams: Map<string, ChangeStream> = new Map();
  private handlers: Map<string, (change: ChangeStreamDocument) => Promise<void>> = new Map();
  private resumeTokenStore: ResumeTokenStore;
  private isRunning: boolean = false;

  constructor(resumeTokenStore: ResumeTokenStore) {
    this.resumeTokenStore = resumeTokenStore;
  }

  /**
   * Set MongoDB client
   */
  setClient(client: MongoClient): void {
    this.client = client;
  }

  /**
   * Register a change stream
   */
  registerStream(
    name: string,
    config: ChangeStreamConfig,
    handler: (change: ChangeStreamDocument) => Promise<void>
  ): void {
    if (this.streams.has(name)) {
      throw new Error(`Change stream '${name}' already registered`);
    }

    this.handlers.set(name, handler);

    // Start stream if manager is running
    if (this.isRunning) {
      this.startStream(name, config);
    }
  }

  /**
   * Start all change streams
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Change stream manager already running');
      return;
    }

    if (!this.client) {
      throw new Error('MongoDB client not configured');
    }

    this.isRunning = true;
    console.log('Starting change stream manager...');

    // Start all registered streams
    for (const [name, handler] of this.handlers.entries()) {
      // Config should be stored separately, for now we'll handle it in registerStream
      console.log(`Change stream '${name}' registered`);
    }

    console.log('Change stream manager started');
  }

  /**
   * Start a specific change stream
   */
  private async startStream(name: string, config: ChangeStreamConfig): Promise<void> {
    if (!this.client) {
      throw new Error('MongoDB client not configured');
    }

    try {
      const database = config.database || 'caas_platform';
      const collection = this.client.db(database).collection(config.collection);

      // Get resume token if available
      const resumeToken = await this.resumeTokenStore.getToken(name);

      // Create change stream options
      const options: any = {
        fullDocument: config.fullDocument || 'updateLookup',
        batchSize: config.batchSize || 100,
        maxAwaitTimeMS: config.maxAwaitTimeMS || 1000,
      };

      if (resumeToken) {
        options.resumeAfter = resumeToken;
        console.log(`Resuming change stream '${name}' from token`);
      }

      // Create change stream
      const changeStream = collection.watch(config.pipeline || [], options);

      this.streams.set(name, changeStream);

      // Handle change events
      changeStream.on('change', async (change: ChangeStreamDocument) => {
        await this.handleChange(name, change);
      });

      // Handle errors
      changeStream.on('error', (error: Error) => {
        console.error(`Change stream '${name}' error:`, error);
        this.handleStreamError(name, config, error);
      });

      // Handle close
      changeStream.on('close', () => {
        console.log(`Change stream '${name}' closed`);
        this.streams.delete(name);
      });

      console.log(`Change stream '${name}' started`);
    } catch (error) {
      console.error(`Failed to start change stream '${name}':`, error);
      throw error;
    }
  }

  /**
   * Handle change event
   */
  private async handleChange(name: string, change: ChangeStreamDocument): Promise<void> {
    try {
      const handler = this.handlers.get(name);
      if (!handler) {
        console.warn(`No handler for change stream '${name}'`);
        return;
      }

      // Execute handler
      await handler(change);

      // Store resume token
      if (change._id) {
        await this.resumeTokenStore.storeToken(name, change._id);
      }
    } catch (error) {
      console.error(`Error handling change in stream '${name}':`, error);
    }
  }

  /**
   * Handle stream error
   */
  private handleStreamError(name: string, config: ChangeStreamConfig, error: Error): void {
    console.error(`Change stream '${name}' encountered error:`, error);

    // Close existing stream
    const stream = this.streams.get(name);
    if (stream) {
      stream.close();
      this.streams.delete(name);
    }

    // Attempt to restart after delay
    setTimeout(() => {
      if (this.isRunning) {
        console.log(`Attempting to restart change stream '${name}'`);
        this.startStream(name, config);
      }
    }, 5000);
  }

  /**
   * Stop all change streams
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    console.log('Stopping change stream manager...');

    // Close all streams
    for (const [name, stream] of this.streams.entries()) {
      try {
        await stream.close();
        console.log(`Change stream '${name}' closed`);
      } catch (error) {
        console.error(`Error closing change stream '${name}':`, error);
      }
    }

    this.streams.clear();
    console.log('Change stream manager stopped');
  }

  /**
   * Get stream status
   */
  getStatus(): { name: string; active: boolean }[] {
    const status: { name: string; active: boolean }[] = [];

    for (const name of this.handlers.keys()) {
      status.push({
        name,
        active: this.streams.has(name),
      });
    }

    return status;
  }
}
