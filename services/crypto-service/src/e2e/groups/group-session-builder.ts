/**
 * Group Session Builder
 * Builds and manages group encryption sessions
 */

import { senderKeyService } from './sender-key-service';
import { memberChangeHandler } from './member-change-handler';

export class GroupSessionBuilder {
  /**
   * Build group session for new group
   */
  async buildGroupSession(
    groupId: string,
    creatorId: string,
    members: string[]
  ): Promise<void> {
    // Initialize group encryption
    await memberChangeHandler.initializeGroupEncryption(groupId, [
      creatorId,
      ...members,
    ]);
  }

  /**
   * Add member to group session
   */
  async addMemberToSession(
    groupId: string,
    newMemberId: string,
    existingMembers: string[]
  ): Promise<void> {
    await memberChangeHandler.handleMemberAdded(
      groupId,
      newMemberId,
      existingMembers
    );
  }

  /**
   * Remove member from group session
   */
  async removeMemberFromSession(
    groupId: string,
    removedMemberId: string,
    remainingMembers: string[]
  ): Promise<void> {
    await memberChangeHandler.handleMemberRemoved(
      groupId,
      removedMemberId,
      remainingMembers
    );
  }

  /**
   * Rebuild group session (full rotation)
   */
  async rebuildGroupSession(
    groupId: string,
    members: string[]
  ): Promise<void> {
    // Cleanup existing encryption
    await memberChangeHandler.cleanupGroupEncryption(groupId);

    // Reinitialize
    await memberChangeHandler.initializeGroupEncryption(groupId, members);
  }

  /**
   * Check if group session is ready
   */
  async isGroupSessionReady(
    groupId: string,
    members: string[]
  ): Promise<boolean> {
    const status = await memberChangeHandler.getGroupEncryptionStatus(
      groupId,
      members
    );

    return status.initialized;
  }

  /**
   * Get group session info
   */
  async getGroupSessionInfo(
    groupId: string,
    members: string[]
  ): Promise<{
    initialized: boolean;
    member_count: number;
    keys_distributed: number;
    missing_keys: string[];
  }> {
    const status = await memberChangeHandler.getGroupEncryptionStatus(
      groupId,
      members
    );

    return {
      initialized: status.initialized,
      member_count: members.length,
      keys_distributed: status.total_keys,
      missing_keys: status.missing_keys,
    };
  }
}

export const groupSessionBuilder = new GroupSessionBuilder();
