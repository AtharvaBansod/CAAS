import { Producer, ProducerRecord, RecordMetadata, Transaction } from 'kafkajs';

export interface ProducerConfig {
  clientId: string;
  brokers: string[];
  retry?: {
    initialRetryTime?: number;
    retries?: number;
  };
}

export interface SendParams<T> {
  topic: string;
  key: string;
  value: T;
  headers?: Record<string, string>;
  partition?: number;
}

export interface SendBatchParams<T> {
  topic: string;
  messages: Array<{
    key: string;
    value: T;
    headers?: Record<string, string>;
    partition?: number;
  }>;
}

export interface ProducerInterceptor {
  onSend<T>(params: SendParams<T>): Promise<SendParams<T>>;
  onSuccess(metadata: RecordMetadata): void;
  onError(error: Error): void;
}
