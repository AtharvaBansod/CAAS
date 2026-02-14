import { InvitationRepository } from './invitation.repository';
import { ConversationAuthorization } from './conversation.authorization';
import { ConversationEnricher } from './conversation.enricher';
import { InviteLink, InviteLinkOptions } from './invitation.types';
import { Conversation } from './conversation.types';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { ConversationRepository } from './conversation.repository';

export class InvitationService {
  constructor(
    private invitationRepository: InvitationRepository,
    private conversationRepository: ConversationRepository,
    private conversationAuthorization: ConversationAuthorization,
    private conversationEnricher: ConversationEnricher,
    private producer: Producer,
  ) { }

  async createInviteLink(
    conversationId: string,
    tenantId: string,
    createdBy: string,
    options?: InviteLinkOptions,
  ): Promise<InviteLink> {
    // Authorization check: Only admins or owners can create invite links
    await this.conversationAuthorization.authorizeConversationAction(
      conversationId,
      createdBy,
      ['admin', 'owner'],
      'create invite links',
      this.conversationRepository,
      tenantId
    );

    const code = uuidv4(); // Generate a unique code for the invite link
    const expires_at = options?.expires_at;
    const max_uses = options?.max_uses;
    const is_active = true;
    const uses = 0;

    const newInviteLink: Omit<InviteLink, 'id' | '_id' | 'created_at' | 'updated_at'> = {
      conversation_id: conversationId,
      tenant_id: tenantId,
      code,
      created_by: createdBy,
      expires_at,
      max_uses,
      uses,
      is_active,
    };

    const inviteLink = await this.invitationRepository.createInviteLink(newInviteLink, tenantId);

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'invite-link-created',
          value: JSON.stringify({
            event: 'invite-link-created',
            conversationId,
            linkId: inviteLink.id,
            createdBy,
            timestamp: new Date(),
          }),
        },
      ],
    });

    return inviteLink;
  }

  async revokeInviteLink(linkId: string, tenantId: string, revokedBy: string): Promise<void> {
    // Authorization check: Only admins or owners can revoke invite links
    const inviteLink = await this.invitationRepository.findInviteLinkById(linkId, tenantId);
    if (!inviteLink) {
      throw new Error('Invite link not found.');
    }

    await this.conversationAuthorization.authorizeConversationAction(
      inviteLink.conversation_id,
      revokedBy,
      ['admin', 'owner'],
      'revoke invite links',
      this.conversationRepository,
      tenantId
    );

    await this.invitationRepository.revokeInviteLink(linkId);

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'invite-link-revoked',
          value: JSON.stringify({
            event: 'invite-link-revoked',
            linkId,
            revokedBy,
            timestamp: new Date(),
          }),
        },
      ],
    });
  }

  async joinViaLink(linkCode: string, userId: string): Promise<Conversation> {
    const inviteLink = await this.invitationRepository.findInviteLinkByCode(linkCode);

    if (!inviteLink || !inviteLink.is_active) {
      throw new Error('Invalid or expired invite link.');
    }

    if (inviteLink.expires_at && inviteLink.expires_at < new Date()) {
      await this.invitationRepository.revokeInviteLink(inviteLink.id); // Automatically revoke expired link
      throw new Error('Invalid or expired invite link.');
    }

    if (inviteLink.max_uses && inviteLink.uses >= inviteLink.max_uses) {
      await this.invitationRepository.revokeInviteLink(inviteLink.id); // Automatically revoke used-up link
      throw new Error('Invalid or expired invite link.');
    }

    // Add user to the conversation
    await this.invitationRepository.addParticipantToConversation(inviteLink.conversation_id, userId);
    await this.invitationRepository.incrementInviteLinkUses(inviteLink.id);

    await this.producer.send({
      topic: 'conversation-events',
      messages: [
        {
          key: 'user-joined-via-invite',
          value: JSON.stringify({
            event: 'user-joined-via-invite',
            conversationId: inviteLink.conversation_id,
            userId,
            linkId: inviteLink.id,
            timestamp: new Date(),
          }),
        },
      ],
    });

    // Fetch and return the updated conversation
    const conversation = await this.invitationRepository.findConversationById(inviteLink.conversation_id, inviteLink.tenant_id);
    if (!conversation) {
      throw new Error('Conversation not found after joining.');
    }
    return conversation;
  }

  async getInviteLinks(conversationId: string, tenantId: string, requestedBy: string): Promise<InviteLink[]> {
    // Authorization check: Only admins or owners can view invite links
    await this.conversationAuthorization.authorizeConversationAction(
      conversationId,
      requestedBy,
      ['admin', 'owner'],
      'view invite links',
      this.conversationRepository,
      tenantId
    );

    return this.invitationRepository.getInviteLinksForConversation(conversationId, tenantId);
  }
}