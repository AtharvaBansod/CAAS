import { TenantAwareRepository } from './tenant-aware.repository';
import { IConversation, ConversationSchemaDefinition } from '../schemas/tenant/conversation.schema';

export class ConversationRepository extends TenantAwareRepository<IConversation> {
  constructor() {
    super('Conversation');
  }

  protected getSchemaDefinition(): any {
    return ConversationSchemaDefinition;
  }
}
