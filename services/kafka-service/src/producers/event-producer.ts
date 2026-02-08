import { TenantProducer } from './tenant-producer';
import { KafkaMessage } from '../types/message-envelope';
import { RecordMetadata } from 'kafkajs';

export class EventProducer extends TenantProducer {
  
  async sendEvent(
    tenantId: string,
    eventType: string,
    event: KafkaMessage<any>
  ): Promise<RecordMetadata[]> {
    // Generic event topic or specific based on type
    return this.sendToTenantTopic(
      tenantId,
      'platform.events', // Or tenant specific events
      event,
      event.payload.id || event.id
    );
  }
  
  async sendNotification(
    tenantId: string,
    notification: KafkaMessage<any>
  ): Promise<RecordMetadata[]> {
    return this.sendToTenantTopic(
      tenantId,
      'notifications',
      notification,
      notification.payload.user_id
    );
  }
}
