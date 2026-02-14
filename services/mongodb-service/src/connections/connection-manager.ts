/**
 * Connection Manager
 * 
 * Manages MongoDB connections with automatic reconnection and failover
 */

import { MongoClient, MongoClientOptions } from 'mongodb';
import { RetryPolicy } from './retry-policy';
import { CircuitBreaker } from './circuit-breaker';

export interface ConnectionManagerOptions {
  uri: string;
  options?: MongoClientOptions;
  retryPolicy?: RetryPolicy;
  circuitBreaker?: CircuitBreaker;
}

export class ConnectionManager {
  private uri: string;
  private options: MongoClientOptions;
  private client?: MongoClient;
  private retryPolicy: RetryPolicy;
  private circuitBreaker: CircuitBreaker;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;

  constructor(config: ConnectionManagerOptions) {
    this.uri = config.uri;
    this.options = config.options || {};
    this.retryPolicy = config.retryPolicy || new RetryPolicy();
    this.circuitBreaker = config.circuitBreaker || new CircuitBreaker();

    // Setup connection event handlers
    this.setupEventHandlers();
  }

  /**
   * Connect to MongoDB
   */
  async connect(): Promise<MongoClient> {
    if (this.client && this.client.topology?.isConnected()) {
      return this.client;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      return this.waitForConnection();
    }

    this.isConnecting = true;

    try {
      // Check circuit breaker
      if (this.circuitBreaker.isOpen()) {
        throw new Error('Circuit breaker is open, connection refused');
      }

      console.log('Connecting to MongoDB...');

      this.client = new MongoClient(this.uri, {
        ...this.options,
        retryWrites: true,
        retryReads: true,
      });

      await this.client.connect();

      console.log('Connected to MongoDB');

      // Reset retry attempts on successful connection
      this.reconnectAttempts = 0;
      this.circuitBreaker.recordSuccess();

      this.isConnecting = false;
      return this.client;
    } catch (error) {
      this.isConnecting = false;
      this.circuitBreaker.recordFailure();

      console.error('Failed to connect to MongoDB:', error);

      // Attempt reconnection with retry policy
      if (this.retryPolicy.shouldRetry(this.reconnectAttempts)) {
        this.reconnectAttempts++;
        const delay = this.retryPolicy.getDelay(this.reconnectAttempts);

        console.log(
          `Retrying connection in ${delay}ms (attempt ${this.reconnectAttempts})`
        );

        await this.sleep(delay);
        return this.connect();
      }

      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      console.log('Disconnecting from MongoDB...');
      await this.client.close();
      this.client = undefined;
      console.log('Disconnected from MongoDB');
    }
  }

  /**
   * Get MongoDB client
   */
  getClient(): MongoClient | undefined {
    return this.client;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return !!this.client && !!this.client.topology?.isConnected();
  }

  /**
   * Setup event handlers for connection events
   */
  private setupEventHandlers(): void {
    // These will be attached when client is created
  }

  /**
   * Wait for existing connection attempt
   */
  private async waitForConnection(): Promise<MongoClient> {
    const maxWait = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.isConnecting) {
      if (Date.now() - startTime > maxWait) {
        throw new Error('Connection timeout');
      }

      await this.sleep(100);
    }

    if (!this.client) {
      throw new Error('Connection failed');
    }

    return this.client;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get connection health
   */
  async getHealth(): Promise<{
    connected: boolean;
    circuitBreakerState: string;
    reconnectAttempts: number;
  }> {
    return {
      connected: this.isConnected(),
      circuitBreakerState: this.circuitBreaker.getState(),
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}
