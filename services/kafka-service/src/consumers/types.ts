import { KafkaMessage } from '../types/message-envelope';

export interface ConsumerConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
  topic: string | RegExp;
  fromBeginning?: boolean;
}

export interface ConsumerMetrics {
  messagesConsumed: number;
  errors: number;
  processingTime: number;
  lastCommittedOffset: string;
}

export interface MessageHandler<T> {
  handle(message: KafkaMessage<T>): Promise<void>;
}
