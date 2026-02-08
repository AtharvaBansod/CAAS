import { TenantProducer } from './tenant-producer';
import { KafkaMessage } from '../types/message-envelope';
import { ChatMessage } from '../schemas/definitions/chat-message.schema';
import { RecordMetadata } from 'kafkajs';

export class MessageProducer extends TenantProducer {
  
  async sendChatMessage(
    tenantId: string, 
    message: KafkaMessage<ChatMessage>
  ): Promise<RecordMetadata[]> {
    return this.sendToTenantTopic(
      tenantId,
      'chat.messages',
      message,
      message.payload.conversation_id // Partition by conversation_id
    );
  }
  
  async sendChatEvent(
    tenantId: string,
    event: KafkaMessage<any> // TODO: Use ChatEvent schema
  ): Promise<RecordMetadata[]> {
    return this.sendToTenantTopic(
      tenantId,
      'chat.events',
      event,
      event.payload.conversation_id
    );
  }
}
