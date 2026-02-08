/**
 * GDPR Data Erasure Service
 * 
 * Handles right to be forgotten requests
 */

import { Db } from 'mongodb';
import { DataErasureRequest, ErasureSummary } from './types';
import * as crypto from 'crypto';

export class DataErasureService {
  constructor(private db: Db) {}

  /**
   * Create erasure request
   */
  async createErasureRequest(
    userId: string,
    tenantId: string
  ): Promise<DataErasureRequest> {
    const verificationCode = this.generateVerificationCode();

    const request: DataErasureRequest = {
      user_id: userId,
      tenant_id: tenantId,
      status: 'pending',
      requested_at: new Date(),
      verification_code: verificationCode,
      verified: false,
    };

    const result = await this.db.collection('privacy_requests').insertOne(request as any);
    request._id = result.insertedId.toString();

    // Send verification email
    await this.sendVerificationEmail(userId, verificationCode);

    return request;
  }

  /**
   * Verify erasure request
   */
  async verifyErasureRequest(requestId: string, code: string): Promise<boolean> {
    const request = await this.db.collection('privacy_requests').findOne({
      _id: requestId,
      verification_code: code,
    } as any);

    if (!request) {
      return false;
    }

    await this.db.collection('privacy_requests').updateOne(
      { _id: requestId } as any,
      { $set: { verified: true } }
    );

    // Queue for processing
    await this.queueErasure(requestId);

    return true;
  }

  /**
   * Process erasure request
   */
  async processErasure(requestId: string): Promise<void> {
    const request = await this.getRequest(requestId);
    if (!request || !request.verified || request.status !== 'pending') {
      return;
    }

    try {
      await this.updateStatus(requestId, 'processing');

      const summary = await this.eraseUserData(request.user_id, request.tenant_id);

      await this.db.collection('privacy_requests').updateOne(
        { _id: requestId } as any,
        {
          $set: {
            status: 'completed',
            completed_at: new Date(),
            erasure_summary: summary,
          },
        }
      );

      await this.notifyUser(request.user_id, 'erasure_complete', summary);
    } catch (error) {
      await this.db.collection('privacy_requests').updateOne(
        { _id: requestId } as any,
        {
          $set: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }
      );
    }
  }

  /**
   * Erase user data
   */
  private async eraseUserData(
    userId: string,
    tenantId: string
  ): Promise<ErasureSummary> {
    const summary: ErasureSummary = {
      user_deleted: false,
      messages_deleted: 0,
      files_deleted: 0,
      conversations_updated: 0,
      groups_updated: 0,
      total_records_affected: 0,
    };

    // Delete messages
    const messagesResult = await this.db.collection('messages').deleteMany({
      sender_id: userId,
      tenant_id: tenantId,
    });
    summary.messages_deleted = messagesResult.deletedCount || 0;

    // Delete files
    const filesResult = await this.db.collection('files').deleteMany({
      uploaded_by: userId,
      tenant_id: tenantId,
    });
    summary.files_deleted = filesResult.deletedCount || 0;

    // Remove from conversations
    const conversationsResult = await this.db.collection('conversations').updateMany(
      { members: userId, tenant_id: tenantId },
      { $pull: { members: userId } }
    );
    summary.conversations_updated = conversationsResult.modifiedCount || 0;

    // Remove from groups
    const groupsResult = await this.db.collection('groups').updateMany(
      { members: userId, tenant_id: tenantId },
      { $pull: { members: userId } }
    );
    summary.groups_updated = groupsResult.modifiedCount || 0;

    // Delete user account
    const userResult = await this.db.collection('users').deleteOne({
      user_id: userId,
      tenant_id: tenantId,
    });
    summary.user_deleted = (userResult.deletedCount || 0) > 0;

    // Delete sessions
    await this.db.collection('user_sessions').deleteMany({
      user_id: userId,
      tenant_id: tenantId,
    });

    // Delete settings
    await this.db.collection('user_settings').deleteMany({
      user_id: userId,
      tenant_id: tenantId,
    });

    summary.total_records_affected =
      summary.messages_deleted +
      summary.files_deleted +
      summary.conversations_updated +
      summary.groups_updated +
      (summary.user_deleted ? 1 : 0);

    return summary;
  }

  /**
   * Generate verification code
   */
  private generateVerificationCode(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Send verification email
   */
  private async sendVerificationEmail(userId: string, code: string): Promise<void> {
    // In production: send email with verification link
    console.log(`Verification code for ${userId}: ${code}`);
  }

  /**
   * Get erasure request
   */
  private async getRequest(requestId: string): Promise<DataErasureRequest | null> {
    return await this.db.collection('privacy_requests').findOne({ _id: requestId } as any);
  }

  /**
   * Update request status
   */
  private async updateStatus(requestId: string, status: string): Promise<void> {
    await this.db.collection('privacy_requests').updateOne(
      { _id: requestId } as any,
      { $set: { status } }
    );
  }

  /**
   * Queue erasure for processing
   */
  private async queueErasure(requestId: string): Promise<void> {
    // In production: send to Kafka/queue
    console.log(`Queued erasure request: ${requestId}`);
    setTimeout(() => this.processErasure(requestId), 1000);
  }

  /**
   * Notify user
   */
  private async notifyUser(userId: string, type: string, data: any): Promise<void> {
    console.log(`Notifying user ${userId}: ${type}`, data);
  }
}
