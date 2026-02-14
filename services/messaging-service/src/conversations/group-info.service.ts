export class GroupInfoService {
  async updateDescription(conversationId: string, description: string, updatedBy: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async updateAvatar(conversationId: string, avatarUrl: string, updatedBy: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async setAnnouncement(conversationId: string, announcement: string, announcedBy: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async clearAnnouncement(conversationId: string, clearedBy: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  async setAnnouncementsOnly(conversationId: string, enabled: boolean, setBy: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

interface GroupSettings {
  description?: string;
  announcement?: {
    text: string;
    set_by: string;
    set_at: Date;
  };
  announcements_only: boolean; // Only admins can post
  members_can_invite: boolean;
  members_can_edit_info: boolean;
}