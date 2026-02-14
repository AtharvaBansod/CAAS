// System message service for automatic system messages
import { MessageRepository } from './message.repository';
import { Message, MessageType, SystemMessageType } from './message.types';

export class SystemMessageService {
  constructor(private messageRepo: MessageRepository) {}

  async createSystemMessage(
    conversationId: string,
    tenantId: string,
    type: SystemMessageType,
    data: Record<string, any>
  ): Promise<Message> {
    return this.messageRepo.create({
      conversation_id: conversationId,
      tenant_id: tenantId,
      sender_id: 'system',
      type: MessageType.SYSTEM,
      content: {
        system: {
          type,
          data,
        },
      },
    });
  }

  async memberJoined(
    conversationId: string,
    tenantId: string,
    userId: string,
    addedBy?: string
  ): Promise<Message> {
    return this.createSystemMessage(conversationId, tenantId, SystemMessageType.MEMBER_JOINED, {
      user_id: userId,
      added_by: addedBy,
    });
  }

  async memberLeft(conversationId: string, tenantId: string, userId: string): Promise<Message> {
    return this.createSystemMessage(conversationId, tenantId, SystemMessageType.MEMBER_LEFT, {
      user_id: userId,
    });
  }

  async memberRemoved(
    conversationId: string,
    tenantId: string,
    userId: string,
    removedBy: string
  ): Promise<Message> {
    return this.createSystemMessage(conversationId, tenantId, SystemMessageType.MEMBER_REMOVED, {
      user_id: userId,
      removed_by: removedBy,
    });
  }

  async groupNameChanged(
    conversationId: string,
    tenantId: string,
    newName: string,
    changedBy: string
  ): Promise<Message> {
    return this.createSystemMessage(conversationId, tenantId, SystemMessageType.GROUP_NAME_CHANGED, {
      new_name: newName,
      changed_by: changedBy,
    });
  }

  async callStarted(conversationId: string, tenantId: string, callerId: string): Promise<Message> {
    return this.createSystemMessage(conversationId, tenantId, SystemMessageType.CALL_STARTED, {
      caller_id: callerId,
    });
  }

  async callEnded(conversationId: string, tenantId: string, duration: number): Promise<Message> {
    return this.createSystemMessage(conversationId, tenantId, SystemMessageType.CALL_ENDED, {
      duration,
    });
  }
}
