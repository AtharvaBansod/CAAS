import mongoose, { Connection } from 'mongoose';
import { EventEmitter } from 'events';
import { getDatabaseConfig, getMongooseOptions, getEnvironment } from '../config';
import { ConnectionError } from '../errors';

/**
 * Connection State
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error',
}

/**
 * Connection Manager Events
 */
export interface ConnectionManagerEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  reconnecting: () => void;
  reconnected: () => void;
}

/**
 * Connection Manager
 * Singleton class to manage MongoDB connections
 */
export class ConnectionManager extends EventEmitter {
  private static instance: ConnectionManager | null = null;
  private connection: Connection | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private constructor() {
    super();
    this.setupEventListeners();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Connect to MongoDB
   */
  public async connect(): Promise<Connection> {
    if (this.state === ConnectionState.CONNECTED && this.connection) {
      return this.connection;
    }

    if (this.state === ConnectionState.CONNECTING) {
      // Wait for existing connection attempt
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new ConnectionError('Connection timeout'));
        }, 30000);

        this.once('connected', () => {
          clearTimeout(timeout);
          resolve(this.connection!);
        });

        this.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    }

    try {
      this.state = ConnectionState.CONNECTING;
      const config = getDatabaseConfig();
      const options = getMongooseOptions();

      console.log(`Connecting to MongoDB at ${this.maskUri(config.uri)}...`);

      this.connection = await mongoose.createConnection(config.uri, options).asPromise();

      this.state = ConnectionState.CONNECTED;
      this.reconnectAttempts = 0;

      console.log('✓ MongoDB connected successfully');
      this.emit('connected');

      return this.connection;
    } catch (error) {
      this.state = ConnectionState.ERROR;
      const connectionError = new ConnectionError(
        `Failed to connect to MongoDB: ${(error as Error).message}`,
        error as Error
      );

      console.error('✗ MongoDB connection failed:', connectionError.message);
      this.emit('error', connectionError);

      throw connectionError;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.connection || this.state === ConnectionState.DISCONNECTED) {
      return;
    }

    try {
      this.state = ConnectionState.DISCONNECTING;
      console.log('Disconnecting from MongoDB...');

      await this.connection.close();

      this.connection = null;
      this.state = ConnectionState.DISCONNECTED;

      console.log('✓ MongoDB disconnected');
      this.emit('disconnected');
    } catch (error) {
      const disconnectError = new ConnectionError(
        `Failed to disconnect from MongoDB: ${(error as Error).message}`,
        error as Error
      );

      console.error('✗ MongoDB disconnect failed:', disconnectError.message);
      this.emit('error', disconnectError);

      throw disconnectError;
    }
  }

  /**
   * Get current connection
   */
  public getConnection(): Connection {
    if (!this.connection || this.state !== ConnectionState.CONNECTED) {
      throw new ConnectionError('Not connected to MongoDB');
    }
    return this.connection;
  }

  /**
   * Get connection state
   */
  public getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.connection !== null;
  }

  /**
   * Handle reconnection
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting to MongoDB (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    this.emit('reconnecting');

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.connect();
      console.log('✓ Reconnected to MongoDB');
      this.emit('reconnected');
    } catch (error) {
      console.error('✗ Reconnection failed:', (error as Error).message);
      await this.handleReconnect();
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    mongoose.connection.on('disconnected', () => {
      if (this.state === ConnectionState.CONNECTED) {
        console.warn('MongoDB connection lost');
        this.state = ConnectionState.DISCONNECTED;
        this.handleReconnect();
      }
    });

    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Mask sensitive parts of URI
   */
  private maskUri(uri: string): string {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  }

  /**
   * Graceful shutdown
   */
  public async gracefulShutdown(): Promise<void> {
    console.log('Initiating graceful shutdown...');

    try {
      await this.disconnect();
      console.log('✓ Graceful shutdown complete');
    } catch (error) {
      console.error('✗ Error during shutdown:', (error as Error).message);
      throw error;
    }
  }
}

/**
 * Get connection manager instance
 */
export function getConnectionManager(): ConnectionManager {
  return ConnectionManager.getInstance();
}
