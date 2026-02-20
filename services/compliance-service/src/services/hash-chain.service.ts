import crypto from 'crypto';
import { config } from '../config/config';

export interface HashChainEntry {
  data: any;
  hash: string;
  previousHash: string;
  timestamp: Date;
}

export class HashChainService {
  private algorithm: string;

  constructor() {
    this.algorithm = config.audit.hashAlgorithm;
  }

  /**
   * Calculate hash for data
   */
  public calculateHash(data: any, previousHash: string): string {
    const content = JSON.stringify({
      data,
      previousHash,
      timestamp: new Date().toISOString(),
    });

    return crypto
      .createHash(this.algorithm)
      .update(content)
      .digest('hex');
  }

  /**
   * Verify hash chain integrity
   */
  public verifyChain(entries: HashChainEntry[]): boolean {
    if (entries.length === 0) return true;

    for (let i = 1; i < entries.length; i++) {
      const current = entries[i];
      const previous = entries[i - 1];

      // Verify that current entry's previousHash matches previous entry's hash
      if (current.previousHash !== previous.hash) {
        console.error(`Hash chain broken at index ${i}`);
        return false;
      }

      // Verify that current entry's hash is valid
      const calculatedHash = this.calculateHash(current.data, current.previousHash);
      if (calculatedHash !== current.hash) {
        console.error(`Invalid hash at index ${i}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get genesis hash (first hash in chain)
   */
  public getGenesisHash(): string {
    return '0'.repeat(64); // 64 zeros for SHA-256
  }
}
