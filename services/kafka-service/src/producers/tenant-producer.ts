import { BaseProducer } from './base-producer';
import { SendParams, SendBatchParams } from './types';
import { KafkaMessage } from '../types/message-envelope';
import { RecordMetadata } from 'kafkajs';

export class TenantProducer extends BaseProducer {
  
  async sendToTenantTopic<T>(
    tenantId: string,
    topicSuffix: string,
    message: KafkaMessage<T>,
    key?: string
  ): Promise<RecordMetadata[]> {
    const topic = `${topicSuffix}.${tenantId}`;
    
    // Ensure tenant_id is in the message
    if (message.tenant_id !== tenantId) {
      message.tenant_id = tenantId;
    }

    return this.send({
      topic,
      key: key || message.id,
      value: message
    });
  }

  async sendBatchToTenantTopic<T>(
    tenantId: string,
    topicSuffix: string,
    messages: Array<{ message: KafkaMessage<T>, key?: string }>
  ): Promise<RecordMetadata[]> {
    const topic = `${topicSuffix}.${tenantId}`;

    const batchMessages = messages.map(item => {
      if (item.message.tenant_id !== tenantId) {
        item.message.tenant_id = tenantId;
      }
      return {
        key: item.key || item.message.id,
        value: item.message
      };
    });

    return this.sendBatch({
      topic,
      messages: batchMessages
    });
  }
}
