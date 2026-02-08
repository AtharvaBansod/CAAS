import { TenantAwareRepository } from './tenant-aware.repository';
import { IMessage, MessageSchemaDefinition } from '../schemas/tenant/message.schema';

export class MessageRepository extends TenantAwareRepository<IMessage> {
  constructor() {
    super('Message');
  }

  protected getSchemaDefinition(): any {
    return MessageSchemaDefinition;
  }

  async findByConversation(conversationId: string, limit: number = 50): Promise<IMessage[]> {
    return this.findMany(
      { conversation_id: conversationId },
      undefined,
      { sort: { created_at: -1 }, limit }
    );
  }
}
