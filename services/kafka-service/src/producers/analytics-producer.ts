import { TenantProducer } from './tenant-producer';
import { KafkaMessage } from '../types/message-envelope';
import { AnalyticsEvent } from '../schemas/definitions/analytics-event.schema';
import { RecordMetadata } from 'kafkajs';

export class AnalyticsProducer extends TenantProducer {
  
  async sendAnalyticsEvent(
    tenantId: string,
    event: KafkaMessage<AnalyticsEvent>
  ): Promise<RecordMetadata[]> {
    // Fire and forget usually, but we return promise here
    // Analytics often partitioned by random or user_id
    return this.sendToTenantTopic(
      tenantId,
      'analytics',
      event
      // No key = round robin / random partition
    );
  }
}
