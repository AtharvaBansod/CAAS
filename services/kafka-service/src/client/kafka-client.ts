import { Kafka, Producer, Consumer, Admin, EachMessagePayload } from 'kafkajs';
import { EventEmitter } from 'events';
import { createKafkaConfig, createProducerConfig, createConsumerConfig, createAdminConfig } from '../config/kafka.config';
import { env } from '../config/environment';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export interface KafkaClientEvents {
  connected: () => void;
  disconnected: () => void;
  reconnecting: () => void;
  reconnected: () => void;
  error: (error: Error) => void;
}

export class KafkaClient extends EventEmitter {
  private static instance: KafkaClient;
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private admin: Admin | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  private constructor() {
    super();
    this.kafka = new Kafka(createKafkaConfig());
    this.setupErrorHandlers();
  }

  public static getInstance(): KafkaClient {
    if (!KafkaClient.instance) {
      KafkaClient.instance = new KafkaClient();
    }
    return KafkaClient.instance;
  }

  private setupErrorHandlers(): void {
    this.kafka.logger().setLogLevel(env.NODE_ENV === 'development' ? 4 : 2);
  }

  public async connect(): Promise<void> {
    if (this.state === ConnectionState.CONNECTED) {
      return;
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      // Create and connect admin client first to test connection
      this.admin = this.kafka.admin(createAdminConfig());
      await this.admin.connect();

      // Create and connect producer
      this.producer = this.kafka.producer(createProducerConfig());
      await this.producer.connect();

      this.setState(ConnectionState.CONNECTED);
      this.reconnectAttempts = 0;
      this.emit('connected');

      console.log('✅ Kafka client connected successfully');
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      this.emit('error', error as Error);
      console.error('❌ Failed to connect to Kafka:', error);
      
      // Attempt reconnection
      await this.scheduleReconnect();
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    this.setState(ConnectionState.DISCONNECTED);

    const disconnectPromises: Promise<void>[] = [];

    // Disconnect all consumers
    for (const [groupId, consumer] of this.consumers) {
      disconnectPromises.push(
        consumer.disconnect().catch(error => {
          console.error(`Error disconnecting consumer ${groupId}:`, error);
        })
      );
    }

    // Disconnect producer
    if (this.producer) {
      disconnectPromises.push(
        this.producer.disconnect().catch(error => {
          console.error('Error disconnecting producer:', error);
        })
      );
    }

    // Disconnect admin
    if (this.admin) {
      disconnectPromises.push(
        this.admin.disconnect().catch(error => {
          console.error('Error disconnecting admin:', error);
        })
      );
    }

    await Promise.all(disconnectPromises);

    this.consumers.clear();
    this.producer = null;
    this.admin = null;

    this.emit('disconnected');
    console.log('✅ Kafka client disconnected');
  }

  public async createProducer(): Promise<Producer> {
    if (!this.producer) {
      throw new Error('Kafka client not connected. Call connect() first.');
    }
    return this.producer;
  }

  public async createConsumer(groupId: string): Promise<Consumer> {
    if (this.state !== ConnectionState.CONNECTED) {
      throw new Error('Kafka client not connected. Call connect() first.');
    }

    if (this.consumers.has(groupId)) {
      return this.consumers.get(groupId)!;
    }

    const consumer = this.kafka.consumer(createConsumerConfig(groupId));
    
    // Setup consumer error handlers
    consumer.on('consumer.crash', async (event) => {
      console.error(`Consumer ${groupId} crashed:`, event.payload.error);
      this.emit('error', event.payload.error);
      
      // Remove crashed consumer and attempt to recreate
      this.consumers.delete(groupId);
      await this.scheduleReconnect();
    });

    consumer.on('consumer.disconnect', () => {
      console.warn(`Consumer ${groupId} disconnected`);
      this.consumers.delete(groupId);
    });

    await consumer.connect();
    this.consumers.set(groupId, consumer);

    console.log(`✅ Consumer ${groupId} created and connected`);
    return consumer;
  }

  public async createAdmin(): Promise<Admin> {
    if (!this.admin) {
      throw new Error('Kafka client not connected. Call connect() first.');
    }
    return this.admin;
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  public async gracefulShutdown(): Promise<void> {
    console.log('🔄 Initiating graceful shutdown...');
    
    try {
      await this.disconnect();
      console.log('✅ Graceful shutdown completed');
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      throw error;
    }
  }

  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    this.state = newState;
    
    if (oldState !== newState) {
      console.log(`🔄 Kafka client state: ${oldState} → ${newState}`);
    }
  }

  private async scheduleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    console.log(`🔄 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.setState(ConnectionState.RECONNECTING);
    this.emit('reconnecting');

    setTimeout(async () => {
      try {
        await this.connect();
        this.emit('reconnected');
        console.log('✅ Reconnection successful');
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        await this.scheduleReconnect();
      }
    }, delay);
  }

  // Utility methods for common operations
  public async listTopics(): Promise<string[]> {
    const admin = await this.createAdmin();
    const metadata = await admin.fetchTopicMetadata();
    return metadata.topics.map(topic => topic.name);
  }

  public async getConsumerGroups(): Promise<string[]> {
    const admin = await this.createAdmin();
    const groups = await admin.listGroups();
    return groups.groups.map(group => group.groupId);
  }

  // Event handler type definitions
  public on<K extends keyof KafkaClientEvents>(
    event: K,
    listener: KafkaClientEvents[K]
  ): this {
    return super.on(event, listener);
  }

  public emit<K extends keyof KafkaClientEvents>(
    event: K,
    ...args: Parameters<KafkaClientEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}

// Export singleton instance getter
export const getKafkaClient = (): KafkaClient => {
  return KafkaClient.getInstance();
};
