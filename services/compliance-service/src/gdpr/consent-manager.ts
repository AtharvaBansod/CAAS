/**
 * GDPR Consent Manager
 * 
 * Manages user consent for data processing
 */

import { Db } from 'mongodb';
import { ConsentRecord } from './types';

export class ConsentManager {
  constructor(private db: Db) {}

  /**
   * Grant consent
   */
  async grantConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentRecord['consent_type'],
    metadata?: {
      ip_address?: string;
      user_agent?: string;
    }
  ): Promise<ConsentRecord> {
    // Revoke existing consent
    await this.revokeConsent(userId, tenantId, consentType);

    const consent: ConsentRecord = {
      user_id: userId,
      tenant_id: tenantId,
      consent_type: consentType,
      granted: true,
      granted_at: new Date(),
      ip_address: metadata?.ip_address,
      user_agent: metadata?.user_agent,
      version: '1.0',
    };

    const result = await this.db.collection('user_consent').insertOne(consent as any);
    consent._id = result.insertedId.toString();

    return consent;
  }

  /**
   * Revoke consent
   */
  async revokeConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentRecord['consent_type']
  ): Promise<void> {
    await this.db.collection('user_consent').updateMany(
      {
        user_id: userId,
        tenant_id: tenantId,
        consent_type: consentType,
        granted: true,
      },
      {
        $set: {
          granted: false,
          revoked_at: new Date(),
        },
      }
    );
  }

  /**
   * Check consent
   */
  async hasConsent(
    userId: string,
    tenantId: string,
    consentType: ConsentRecord['consent_type']
  ): Promise<boolean> {
    const consent = await this.db.collection('user_consent').findOne({
      user_id: userId,
      tenant_id: tenantId,
      consent_type: consentType,
      granted: true,
    });

    return consent !== null;
  }

  /**
   * Get all consents for user
   */
  async getUserConsents(userId: string, tenantId: string): Promise<ConsentRecord[]> {
    return await this.db
      .collection('user_consent')
      .find({
        user_id: userId,
        tenant_id: tenantId,
      })
      .sort({ granted_at: -1 })
      .toArray();
  }

  /**
   * Get consent history
   */
  async getConsentHistory(
    userId: string,
    tenantId: string,
    consentType: ConsentRecord['consent_type']
  ): Promise<ConsentRecord[]> {
    return await this.db
      .collection('user_consent')
      .find({
        user_id: userId,
        tenant_id: tenantId,
        consent_type: consentType,
      })
      .sort({ granted_at: -1 })
      .toArray();
  }
}
