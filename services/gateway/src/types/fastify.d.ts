import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserSettingsService } from '@messaging-service/conversations/user-settings.service';
import { GroupInfoService } from '@messaging-service/conversations/group-info.service';
import { ConversationService } from '@messaging-service/conversations/conversation.service';
import { GroupConversationService } from '@messaging-service/conversations/group-conversation.service';
import { InvitationService } from '@messaging-service/conversations/invitation.service';
import { ModerationService } from '@messaging-service/conversations/moderation.service';
import { PinnedMessagesService } from '@messaging-service/conversations/pinned-messages.service';

declare module 'fastify' {
  interface FastifyInstance {
    container: {
      resolve<T>(name: 'userSettingsService'): UserSettingsService;
      resolve<T>(name: 'groupInfoService'): GroupInfoService;
      resolve<T>(name: 'conversationService'): ConversationService;
      resolve<T>(name: 'groupConversationService'): GroupConversationService;
      resolve<T>(name: 'invitationService'): InvitationService;
      resolve<T>(name: 'moderationService'): ModerationService;
      resolve<T>(name: 'pinnedMessagesService'): PinnedMessagesService;
      // Add other services as needed
    };
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }

  interface FastifyRequest {
    user: {
      id: string;
      tenant_id: string;
      sub?: string;
      jti?: string;
      email?: string;
      roles?: string[];
      scopes?: string[];
    };
    apiVersion: string;
    // tenant is already defined in tenant-context.ts
  }
}