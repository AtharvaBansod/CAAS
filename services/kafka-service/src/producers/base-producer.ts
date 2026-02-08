import { Kafka, Producer, RecordMetadata, Transaction } from 'kafkajs';
import { KafkaConfig } from '../config/kafka.config';
import { ProducerConfig, SendParams, SendBatchParams } from './types';
import { SchemaRegistryClient } from '../schemas/registry-client';
import { ProducerMetrics } from './producer-metrics';

export class BaseProducer {
  protected producer: Producer;
  protected schemaRegistry: SchemaRegistryClient;
  protected metrics: ProducerMetrics;
  private isConnected: boolean = false;

  constructor(
    protected kafkaConfig: KafkaConfig,
    protected producerConfig: ProducerConfig
  ) {
    const kafka = new Kafka({
      clientId: producerConfig.clientId,
      brokers: producerConfig.brokers,
      retry: producerConfig.retry
    });

    this.producer = kafka.producer({
      allowAutoTopicCreation: false,
      transactionTimeout: 30000
    });

    this.schemaRegistry = SchemaRegistryClient.getInstance();
    this.metrics = new ProducerMetrics();
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Producer connected to Kafka');
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('Producer disconnected from Kafka');
    }
  }

  async send<T>(params: SendParams<T>): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const startTime = Date.now();
      
      // TODO: Serialize value using Schema Registry if needed
      // For now we assume JSON
      const value = JSON.stringify(params.value);

      const record = {
        topic: params.topic,
        messages: [{
          key: params.key,
          value,
          headers: params.headers,
          partition: params.partition
        }]
      };

      const result = await this.producer.send(record);
      
      this.metrics.recordSend(params.topic, Date.now() - startTime);
      return result;
    } catch (error) {
      this.metrics.recordError(params.topic);
      console.error('Error producing message:', error);
      throw error;
    }
  }

  async sendBatch<T>(params: SendBatchParams<T>): Promise<RecordMetadata[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const startTime = Date.now();

      const messages = params.messages.map(msg => ({
        key: msg.key,
        value: JSON.stringify(msg.value),
        headers: msg.headers,
        partition: msg.partition
      }));

      const result = await this.producer.send({
        topic: params.topic,
        messages
      });

      this.metrics.recordBatchSend(params.topic, messages.length, Date.now() - startTime);
      return result;
    } catch (error) {
      this.metrics.recordError(params.topic);
      console.error('Error producing batch:', error);
      throw error;
    }
  }

  async transaction<R>(callback: (producer: BaseProducer) => Promise<R>): Promise<R> {
    if (!this.isConnected) {
      await this.connect();
    }

    const transaction = await this.producer.transaction();
    
    try {
      // We need to wrap the transaction logic properly
      // For simplicity in this base class, we just execute the callback
      // In a real implementation, we would pass a transactional producer wrapper
      const result = await callback(this);
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.abort();
      throw error;
    }
  }
}
