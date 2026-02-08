/**
 * IP Blacklist
 * 
 * Platform-wide IP blacklisting with automatic threat detection
 */

export interface IPBlacklistEntry {
  _id?: string;
  ip_address: string;
  reason: 'manual' | 'rate_limit' | 'brute_force' | 'security_event' | 'threat_intel';
  description?: string;
  added_by?: string;
  added_at: Date;
  expires_at?: Date; // null for permanent ban
  is_permanent: boolean;
}

export class IPBlacklist {
  private entries: Map<string, IPBlacklistEntry>; // ip_address -> entry
  private bloomFilter?: Set<string>; // For fast negative lookups

  constructor() {
    this.entries = new Map();
    this.bloomFilter = new Set();
  }

  /**
   * Add IP to blacklist
   */
  addEntry(entry: IPBlacklistEntry): void {
    this.entries.set(entry.ip_address, entry);
    this.bloomFilter?.add(entry.ip_address);
  }

  /**
   * Remove IP from blacklist
   */
  removeEntry(ipAddress: string): boolean {
    const deleted = this.entries.delete(ipAddress);
    if (deleted) {
      this.bloomFilter?.delete(ipAddress);
    }
    return deleted;
  }

  /**
   * Check if IP is blacklisted
   */
  isBlacklisted(ipAddress: string): boolean {
    // Quick bloom filter check
    if (this.bloomFilter && !this.bloomFilter.has(ipAddress)) {
      return false;
    }

    const entry = this.entries.get(ipAddress);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (!entry.is_permanent && entry.expires_at && entry.expires_at < new Date()) {
      this.removeEntry(ipAddress);
      return false;
    }

    return true;
  }

  /**
   * Get blacklist entry
   */
  getEntry(ipAddress: string): IPBlacklistEntry | undefined {
    return this.entries.get(ipAddress);
  }

  /**
   * Get all entries
   */
  getAllEntries(): IPBlacklistEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Add temporary ban (auto-expires)
   */
  addTemporaryBan(
    ipAddress: string,
    reason: IPBlacklistEntry['reason'],
    durationMinutes: number,
    description?: string
  ): void {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    this.addEntry({
      ip_address: ipAddress,
      reason,
      description,
      added_at: new Date(),
      expires_at: expiresAt,
      is_permanent: false,
    });
  }

  /**
   * Add permanent ban
   */
  addPermanentBan(
    ipAddress: string,
    reason: IPBlacklistEntry['reason'],
    addedBy: string,
    description?: string
  ): void {
    this.addEntry({
      ip_address: ipAddress,
      reason,
      description,
      added_by: addedBy,
      added_at: new Date(),
      is_permanent: true,
    });
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = new Date();
    let removed = 0;

    for (const [ip, entry] of this.entries.entries()) {
      if (!entry.is_permanent && entry.expires_at && entry.expires_at < now) {
        this.removeEntry(ip);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Load entries from database
   */
  async loadFromDatabase(db: any): Promise<void> {
    const entries = await db.collection('ip_blacklist').find({}).toArray();
    
    for (const entry of entries) {
      this.addEntry(entry);
    }

    // Clean up expired entries
    this.cleanup();
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    permanent: number;
    temporary: number;
    byReason: Record<string, number>;
  } {
    const stats = {
      total: this.entries.size,
      permanent: 0,
      temporary: 0,
      byReason: {} as Record<string, number>,
    };

    for (const entry of this.entries.values()) {
      if (entry.is_permanent) {
        stats.permanent++;
      } else {
        stats.temporary++;
      }

      stats.byReason[entry.reason] = (stats.byReason[entry.reason] || 0) + 1;
    }

    return stats;
  }
}
