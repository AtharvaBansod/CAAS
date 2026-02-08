/**
 * Member Change Handler
 * Handles group membership changes and key rotation
 */

import { senderKeyService } from './sender-key-service';
import { senderKeyStore } from './sender-key-store';

export class MemberChangeHandler {
  /**
   * Handle member added to group
   */
  async handleMemberAdded(
    groupId: string,
    newMemberId: string,
    existingMembers: string[]
  ): Promise<void> {
    // Distribute all existing sender keys to new member
    for (const memberId of existingMembers) {
      try {
        await senderKeyService.distributeSenderKey(
          groupId,
          memberId,
          1, // Device ID
          newMemberId
        );
      } catch (error) {
        console.error(
          `Failed to distribute sender key from ${memberId}:`,
          (error as Error).message
        );
      }
    }

    // New member creates their own sender key
    await senderKeyService.createSenderKey(groupId, newMemberId, 1);

    // Distribute new member's sender key to all existing members
    for (const memberId of existingMembers) {
      try {
        await senderKeyService.distributeSenderKey(
          groupId,
          newMemberId,
          1,
          memberId
        );
      } catch (error) {
        console.error(
          `Failed to distribute new member key to ${memberId}:`,
          (error as Error).message
        );
      }
    }
  }

  /**
   * Handle member removed from group
   */
  async handleMemberRemoved(
    groupId: string,
    removedMemberId: string,
    remainingMembers: string[]
  ): Promise<void> {
    // Delete removed member's sender key from all remaining members
    await senderKeyStore.deleteSenderKey(groupId, removedMemberId, 1);

    // Rotate all sender keys for security
    await this.rotateAllSenderKeys(groupId, remainingMembers);
  }

  /**
   * Rotate all sender keys in group
   */
  async rotateAllSenderKeys(
    groupId: string,
    members: string[]
  ): Promise<void> {
    for (const memberId of members) {
      try {
        // Create new sender key
        const distribution = await senderKeyService.createSenderKey(
          groupId,
          memberId,
          1
        );

        // Distribute to all other members
        for (const recipientId of members) {
          if (recipientId !== memberId) {
            await senderKeyService.distributeSenderKey(
              groupId,
              memberId,
              1,
              recipientId
            );
          }
        }
      } catch (error) {
        console.error(
          `Failed to rotate sender key for ${memberId}:`,
          (error as Error).message
        );
      }
    }
  }

  /**
   * Handle admin change
   */
  async handleAdminChange(
    groupId: string,
    newAdminId: string,
    members: string[]
  ): Promise<void> {
    // Admin changes don't require key rotation
    // Just log the event
    console.log(`Admin changed to ${newAdminId} in group ${groupId}`);
  }

  /**
   * Initialize group encryption
   */
  async initializeGroupEncryption(
    groupId: string,
    members: string[]
  ): Promise<void> {
    // Each member creates their sender key
    for (const memberId of members) {
      await senderKeyService.createSenderKey(groupId, memberId, 1);
    }

    // Distribute all sender keys to all members
    for (const senderId of members) {
      for (const recipientId of members) {
        if (senderId !== recipientId) {
          try {
            await senderKeyService.distributeSenderKey(
              groupId,
              senderId,
              1,
              recipientId
            );
          } catch (error) {
            console.error(
              `Failed to distribute key from ${senderId} to ${recipientId}:`,
              (error as Error).message
            );
          }
        }
      }
    }
  }

  /**
   * Cleanup group encryption
   */
  async cleanupGroupEncryption(groupId: string): Promise<void> {
    // Delete all sender keys for group
    await senderKeyStore.deleteGroupSenderKeys(groupId);
  }

  /**
   * Get group encryption status
   */
  async getGroupEncryptionStatus(
    groupId: string,
    members: string[]
  ): Promise<{
    initialized: boolean;
    missing_keys: string[];
    total_keys: number;
  }> {
    const groupKeys = await senderKeyStore.getGroupSenderKeys(groupId);
    const existingSenders = new Set(groupKeys.map(k => k.sender_id));

    const missingKeys = members.filter(m => !existingSenders.has(m));

    return {
      initialized: missingKeys.length === 0,
      missing_keys: missingKeys,
      total_keys: groupKeys.length,
    };
  }
}

export const memberChangeHandler = new MemberChangeHandler();
