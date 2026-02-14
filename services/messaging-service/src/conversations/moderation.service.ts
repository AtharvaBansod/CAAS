import { ModerationRepository } from './moderation.repository';
import { ConversationAuthorization } from './conversation.authorization';
import { ConversationEnricher } from './conversation.enricher';
import { Kafka, Producer } from 'kafkajs';
import { ConversationRepository } from './conversation.repository';
import { AuditLogService } from './audit-log.service';

export class ModerationService {
  constructor(
    private moderationRepository: ModerationRepository,
    private conversationRepository: ConversationRepository,
    private conversationAuthorization: ConversationAuthorization,
    private conversationEnricher: ConversationEnricher,
    private producer: Producer,
    private auditLogService: AuditLogService,
  ) { }

  async muteUser(conversationId: string, userId: string, tenantId: string, duration: number | null | undefined, mutedBy: string): Promise<void> {
    // Authorization check: Only admins or owners can mute users
    await this.conversationAuthorization.authorizeConversationAction(
      conversationId,
      mutedBy,
      ['admin', 'owner'],
      'mute users',
      this.conversationRepository,
      tenantId
    );

    const expires_at = duration ? new Date(Date.now() + duration * 1000) : undefined; // duration in seconds

    await this.moderationRepository.muteUser({
      conversation_id: conversationId,
      user_id: userId,
      muted_by: mutedBy,
      expires_at,
      is_active: true,
    });

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'user-muted',
          value: JSON.stringify({
            event: 'user-muted',
            conversationId,
            userId,
            mutedBy,
            duration,
            timestamp: new Date(),
          }),
        },
      ],
    });

    await this.auditLogService.logAdminAction({
      conversation_id: conversationId,
      action: 'mute_user',
      actor_id: mutedBy,
      target_id: userId,
      details: { duration },
    });
  }

  async unmuteUser(conversationId: string, userId: string, tenantId: string, unmutedBy: string): Promise<void> {
    // Authorization check: Only admins or owners can unmute users
    await this.conversationAuthorization.authorizeConversationAction(
      conversationId,
      unmutedBy,
      ['admin', 'owner'],
      'unmute users',
      this.conversationRepository,
      tenantId
    );

    await this.moderationRepository.unmuteUser(conversationId, userId);

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'user-unmuted',
          value: JSON.stringify({
            event: 'user-unmuted',
            conversationId,
            userId,
            unmutedBy,
            timestamp: new Date(),
          }),
        },
      ],
    });

    await this.auditLogService.logAdminAction({
      conversation_id: conversationId,
      action: 'unmute_user',
      actor_id: unmutedBy,
      target_id: userId,
    });
  }

  async banUser(conversationId: string, userId: string, tenantId: string, bannedBy: string, reason?: string | null): Promise<void> {
    // Authorization check: Only admins or owners can ban users
    await this.conversationAuthorization.authorizeConversationAction(
      conversationId,
      bannedBy,
      ['admin', 'owner'],
      'ban users',
      this.conversationRepository,
      tenantId
    );

    await this.moderationRepository.banUser({
      conversation_id: conversationId,
      user_id: userId,
      banned_by: bannedBy,
      reason,
      is_active: true,
    });

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'user-banned',
          value: JSON.stringify({
            event: 'user-banned',
            conversationId,
            userId,
            bannedBy,
            reason,
            timestamp: new Date(),
          }),
        },
      ],
    });

    await this.auditLogService.logAdminAction({
      conversation_id: conversationId,
      action: 'ban_user',
      actor_id: bannedBy,
      target_id: userId,
      details: { reason },
    });
  }

  async unbanUser(conversationId: string, userId: string, tenantId: string, unbannedBy: string): Promise<void> {
    // Authorization check: Only admins or owners can unban users
    await this.conversationAuthorization.authorizeConversationAction(
      conversationId,
      unbannedBy,
      ['admin', 'owner'],
      'unban users',
      this.conversationRepository,
      tenantId
    );

    await this.moderationRepository.unbanUser(conversationId, userId);

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'user-unbanned',
          value: JSON.stringify({
            event: 'user-unbanned',
            conversationId,
            userId,
            unbannedBy,
            timestamp: new Date(),
          }),
        },
      ],
    });

    await this.auditLogService.logAdminAction({
      conversation_id: conversationId,
      action: 'unban_user',
      actor_id: unbannedBy,
      target_id: userId,
    });
  }

  async deleteMessage(conversationId: string, messageId: string, tenantId: string, deletedBy: string): Promise<void> {
    // Authorization check: Only admins or owners can delete messages
    await this.conversationAuthorization.authorizeConversationAction(
      conversationId,
      deletedBy,
      ['admin', 'owner'],
      'delete messages',
      this.conversationRepository,
      tenantId
    );

    await this.moderationRepository.deleteMessage(conversationId, messageId);

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'message-deleted',
          value: JSON.stringify({
            event: 'message-deleted',
            conversationId,
            messageId,
            deletedBy,
            timestamp: new Date(),
          }),
        },
      ],
    });

    await this.auditLogService.logAdminAction({
      conversation_id: conversationId,
      action: 'delete_message',
      actor_id: deletedBy,
      target_id: messageId,
    });
  }
}