/**
 * Legal Hold Service
 * 
 * Manages legal holds that suspend retention policies
 */

import { Db } from 'mongodb';
import { LegalHold } from './types';

export class LegalHoldService {
  constructor(private db: Db) {}

  /**
   * Create legal hold
   */
  async createHold(hold: Omit<LegalHold, '_id'>): Promise<LegalHold> {
    const result = await this.db.collection('legal_holds').insertOne(hold as any);
    return { ...hold, _id: result.insertedId.toString() };
  }

  /**
   * Release legal hold
   */
  async releaseHold(holdId: string): Promise<boolean> {
    const result = await this.db.collection('legal_holds').updateOne(
      { _id: holdId } as any,
      { $set: { is_active: false } }
    );

    return (result.modifiedCount || 0) > 0;
  }

  /**
   * Check if data is under legal hold
   */
  async isUnderHold(
    tenantId: string,
    dataType: string,
    resourceId?: string
  ): Promise<boolean> {
    const query: any = {
      tenant_id: tenantId,
      data_type: dataType,
      is_active: true,
    };

    if (resourceId) {
      query.$or = [
        { resource_ids: { $exists: false } }, // Hold on all data
        { resource_ids: resourceId }, // Hold on specific resource
      ];
    }

    const hold = await this.db.collection('legal_holds').findOne(query);
    return hold !== null;
  }

  /**
   * Get active holds for tenant
   */
  async getActiveHolds(tenantId: string): Promise<LegalHold[]> {
    return await this.db
      .collection('legal_holds')
      .find({
        tenant_id: tenantId,
        is_active: true,
      })
      .toArray();
  }
}
