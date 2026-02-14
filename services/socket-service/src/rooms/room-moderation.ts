import { EventEmitter } from 'events';
import { RoomAuthorizer } from './room-authorizer';
import { RoomStateManager } from './room-state-manager';

interface ModerationAction {
  action: 'kick' | 'ban' | 'unban' | 'mute' | 'unmute';
  moderator_id: string;
  target_user_id: string;
  conversation_id: string;
  tenant_id: string;
  reason?: string;
  duration_seconds?: number;
  timestamp: Date;
}

interface ModerationLog extends ModerationAction {
  id: string;
}

export class RoomModeration extends EventEmitter {
  private authorizer: RoomAuthorizer;
  private stateManager: RoomStateManager;
  private moderationLogs: Map<string, ModerationLog[]> = new Map();

  constructor(authorizer: RoomAuthorizer, stateManager: RoomStateManager) {
    super();
    this.authorizer = authorizer;
    this.stateManager = stateManager;
  }

  /**
   * Kick user from room
   */
  async kickUser(
    moderatorId: string,
    targetUserId: string,
    conversationId: string,
    tenantId: string,
    reason?: string
  ): Promise<void> {
    // Check if moderator has permission
    const canModerate = await this.authorizer.canModerate(
      moderatorId,
      conversationId,
      tenantId
    );

    if (!canModerate.authorized) {
      throw new Error('Moderator does not have permission to kick users');
    }

    // Remove user from room
    await this.stateManager.removeMember(conversationId, tenantId, targetUserId);

    // Log the action
    await this.logModerationAction({
      action: 'kick',
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      reason,
      timestamp: new Date(),
    });

    this.emit('user:kicked', {
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      reason,
    });
  }

  /**
   * Ban user from room
   */
  async banUser(
    moderatorId: string,
    targetUserId: string,
    conversationId: string,
    tenantId: string,
    durationSeconds?: number,
    reason?: string
  ): Promise<void> {
    // Check if moderator has permission
    const canModerate = await this.authorizer.canModerate(
      moderatorId,
      conversationId,
      tenantId
    );

    if (!canModerate.authorized) {
      throw new Error('Moderator does not have permission to ban users');
    }

    // Ban user
    await this.authorizer.banUser(targetUserId, conversationId, tenantId, durationSeconds);

    // Remove user from room if present
    await this.stateManager.removeMember(conversationId, tenantId, targetUserId);

    // Log the action
    await this.logModerationAction({
      action: 'ban',
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      reason,
      duration_seconds: durationSeconds,
      timestamp: new Date(),
    });

    this.emit('user:banned', {
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      duration_seconds: durationSeconds,
      reason,
    });
  }

  /**
   * Unban user from room
   */
  async unbanUser(
    moderatorId: string,
    targetUserId: string,
    conversationId: string,
    tenantId: string,
    reason?: string
  ): Promise<void> {
    // Check if moderator has permission
    const canModerate = await this.authorizer.canModerate(
      moderatorId,
      conversationId,
      tenantId
    );

    if (!canModerate.authorized) {
      throw new Error('Moderator does not have permission to unban users');
    }

    // Unban user
    await this.authorizer.unbanUser(targetUserId, conversationId, tenantId);

    // Log the action
    await this.logModerationAction({
      action: 'unban',
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      reason,
      timestamp: new Date(),
    });

    this.emit('user:unbanned', {
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      reason,
    });
  }

  /**
   * Mute user in room
   */
  async muteUser(
    moderatorId: string,
    targetUserId: string,
    conversationId: string,
    tenantId: string,
    durationSeconds?: number,
    reason?: string
  ): Promise<void> {
    // Check if moderator has permission
    const canModerate = await this.authorizer.canModerate(
      moderatorId,
      conversationId,
      tenantId
    );

    if (!canModerate.authorized) {
      throw new Error('Moderator does not have permission to mute users');
    }

    // Mute user
    await this.authorizer.muteUser(targetUserId, conversationId, tenantId, durationSeconds);

    // Log the action
    await this.logModerationAction({
      action: 'mute',
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      reason,
      duration_seconds: durationSeconds,
      timestamp: new Date(),
    });

    this.emit('user:muted', {
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      duration_seconds: durationSeconds,
      reason,
    });
  }

  /**
   * Unmute user in room
   */
  async unmuteUser(
    moderatorId: string,
    targetUserId: string,
    conversationId: string,
    tenantId: string,
    reason?: string
  ): Promise<void> {
    // Check if moderator has permission
    const canModerate = await this.authorizer.canModerate(
      moderatorId,
      conversationId,
      tenantId
    );

    if (!canModerate.authorized) {
      throw new Error('Moderator does not have permission to unmute users');
    }

    // Unmute user
    await this.authorizer.unmuteUser(targetUserId, conversationId, tenantId);

    // Log the action
    await this.logModerationAction({
      action: 'unmute',
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      reason,
      timestamp: new Date(),
    });

    this.emit('user:unmuted', {
      moderator_id: moderatorId,
      target_user_id: targetUserId,
      conversation_id: conversationId,
      tenant_id: tenantId,
      reason,
    });
  }

  /**
   * Log moderation action
   */
  private async logModerationAction(action: ModerationAction): Promise<void> {
    const key = `${action.tenant_id}:${action.conversation_id}`;
    const logs = this.moderationLogs.get(key) || [];
    
    const log: ModerationLog = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    logs.push(log);
    
    // Keep only last 100 logs per conversation
    if (logs.length > 100) {
      logs.shift();
    }

    this.moderationLogs.set(key, logs);

    // Emit for audit logging
    this.emit('moderation:logged', log);
  }

  /**
   * Get moderation logs for conversation
   */
  getModerationLogs(conversationId: string, tenantId: string): ModerationLog[] {
    const key = `${tenantId}:${conversationId}`;
    return this.moderationLogs.get(key) || [];
  }

  /**
   * Clear moderation logs for conversation
   */
  clearModerationLogs(conversationId: string, tenantId: string): void {
    const key = `${tenantId}:${conversationId}`;
    this.moderationLogs.delete(key);
  }
}
