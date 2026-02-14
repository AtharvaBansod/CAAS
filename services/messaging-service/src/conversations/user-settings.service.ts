import { UserSettingsRepository } from './user-settings.repository';
import { UserConversationSettings, MuteStatus, ArchiveStatus, PinStatus, DeleteStatus } from './user-settings.types';

export class UserSettingsService {
  constructor(private readonly userSettingsRepository: UserSettingsRepository) { }

  // Mute Logic
  async muteConversation(userId: string, conversationId: string, options: MuteOptions): Promise<void> {
    const mutedUntil = options.duration ? new Date(Date.now() + options.duration) : undefined;
    await this.userSettingsRepository.createOrUpdateUserSettings(
      userId,
      conversationId,
      {
        muted_at: new Date(),
        muted_until: mutedUntil,
        show_notifications: options.show_notifications ?? true,
        mention_exceptions: options.mention_exceptions ?? false,
      },
    );
  }
  async unmuteConversation(userId: string, conversationId: string): Promise<void> {
    await this.userSettingsRepository.deleteMuteStatus(userId, conversationId);
  }
  async getMuteStatus(userId: string, conversationId: string): Promise<MuteStatus | null> {
    return this.userSettingsRepository.getMuteStatus(userId, conversationId);
  }
  async getMutedConversations(userId: string): Promise<MuteStatus[]> {
    return this.userSettingsRepository.getMutedConversations(userId);
  }

  // Archive Logic
  async archiveConversation(userId: string, conversationId: string): Promise<void> {
    await this.userSettingsRepository.createOrUpdateUserSettings(
      userId,
      conversationId,
      {
        is_archived: true,
        archived_at: new Date(),
      },
    );
  }
  async unarchiveConversation(userId: string, conversationId: string): Promise<void> {
    await this.userSettingsRepository.createOrUpdateUserSettings(
      userId,
      conversationId,
      {
        is_archived: false,
        archived_at: undefined, // Remove archived_at
      },
    );
  }
  async getArchivedConversations(userId: string): Promise<ArchiveStatus[]> {
    return this.userSettingsRepository.getArchivedConversations(userId);
  }
  async isArchived(userId: string, conversationId: string): Promise<boolean> {
    const status = await this.userSettingsRepository.getArchiveStatus(userId, conversationId);
    return status?.is_archived ?? false;
  }

  // Pin Logic
  async pinConversation(userId: string, conversationId: string): Promise<void> {
    // Get existing pinned count or max order to append? 
    // For now, simpler: just set is_pinned=true. 
    // Ideally we want to put it at the top (order=0) and shift others, or bottom.
    // Let's assume we put it at the "end" (highest order + 1) or "start" (0).
    // Let's just set it pinned, reordering is separate.
    await this.userSettingsRepository.createOrUpdateUserSettings(
      userId,
      conversationId,
      {
        is_pinned: true,
        pinned_at: new Date(),
        // If order matters, we'd need to fetch others. 
        // For MVP, just setting pinned.
      }
    );
  }

  async unpinConversation(userId: string, conversationId: string): Promise<void> {
    await this.userSettingsRepository.createOrUpdateUserSettings(
      userId,
      conversationId,
      {
        is_pinned: false,
        pinned_at: undefined,
        pin_order: undefined
      }
    );
  }

  async reorderPinnedConversations(userId: string, orderedIds: string[]): Promise<void> {
    // Bulk update pin orders
    const updates = orderedIds.map((id, index) => {
      return this.userSettingsRepository.createOrUpdateUserSettings(
        userId,
        id,
        { is_pinned: true, pin_order: index }
      );
    });
    await Promise.all(updates);
  }

  async getPinnedConversations(userId: string): Promise<PinStatus[]> {
    return this.userSettingsRepository.getPinnedConversations(userId);
  }

  // Delete / Cleanup Logic
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    // Soft delete
    await this.userSettingsRepository.createOrUpdateUserSettings(
      userId,
      conversationId,
      {
        is_deleted: true,
        deleted_at: new Date()
      }
    );
  }

  async restoreConversation(userId: string, conversationId: string): Promise<void> {
    await this.userSettingsRepository.createOrUpdateUserSettings(
      userId,
      conversationId,
      {
        is_deleted: false,
        deleted_at: undefined
      }
    );
  }

  async clearHistory(userId: string, conversationId: string, beforeDate?: Date): Promise<void> {
    await this.userSettingsRepository.createOrUpdateUserSettings(
      userId,
      conversationId,
      {
        cleared_history_at: beforeDate || new Date()
      }
    );
  }

  async getDeletedConversations(userId: string): Promise<DeleteStatus[]> {
    return this.userSettingsRepository.getDeletedConversations(userId);
  }
}

interface MuteOptions {
  duration?: number; // milliseconds, null for permanent
  show_notifications?: boolean;
  mention_exceptions?: boolean; // Still notify on mentions
}