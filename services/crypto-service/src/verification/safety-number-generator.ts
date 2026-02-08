/**
 * Safety Number Generator
 * Generates consistent safety numbers for user pairs
 */

import { sha512 } from '@noble/hashes/sha512';

export class SafetyNumberGenerator {
  /**
   * Generate safety number for two users
   * Order-independent: same number regardless of which user generates it
   */
  generate(
    user1Id: string,
    user1IdentityKey: Buffer,
    user2Id: string,
    user2IdentityKey: Buffer
  ): string {
    // Ensure consistent ordering
    const [firstId, firstKey, secondId, secondKey] =
      user1Id < user2Id
        ? [user1Id, user1IdentityKey, user2Id, user2IdentityKey]
        : [user2Id, user2IdentityKey, user1Id, user1IdentityKey];

    // Concatenate: version + id1 + key1 + id2 + key2
    const data = Buffer.concat([
      Buffer.from([0x00]), // version
      Buffer.from(firstId),
      firstKey,
      Buffer.from(secondId),
      secondKey,
    ]);

    // Hash with SHA-512
    const hash = sha512(data);

    // Convert to 60 digits (12 groups of 5)
    return this.hashToDigits(Buffer.from(hash));
  }

  /**
   * Convert hash to 60-digit safety number
   * Format: 12345 67890 12345 67890 ... (12 groups of 5 digits)
   */
  private hashToDigits(hash: Buffer): string {
    const digits: string[] = [];

    for (let i = 0; i < 12; i++) {
      // Take 5 bytes from hash
      const offset = (i * 5) % hash.length;
      const chunk = hash.subarray(offset, offset + 5);

      // Convert to number
      let num = 0;
      for (let j = 0; j < chunk.length; j++) {
        num = num * 256 + chunk[j];
      }

      // Convert to 5 digits
      const fiveDigits = (num % 100000).toString().padStart(5, '0');
      digits.push(fiveDigits);
    }

    return digits.join(' ');
  }

  /**
   * Compare two safety numbers
   */
  compare(safetyNumber1: string, safetyNumber2: string): boolean {
    // Remove spaces and compare
    const clean1 = safetyNumber1.replace(/\s/g, '');
    const clean2 = safetyNumber2.replace(/\s/g, '');

    return clean1 === clean2;
  }

  /**
   * Format safety number for display
   * Groups of 5 digits with spaces
   */
  format(safetyNumber: string): string {
    const clean = safetyNumber.replace(/\s/g, '');
    const groups: string[] = [];

    for (let i = 0; i < clean.length; i += 5) {
      groups.push(clean.slice(i, i + 5));
    }

    return groups.join(' ');
  }

  /**
   * Parse safety number (remove formatting)
   */
  parse(formatted: string): string {
    return formatted.replace(/\s/g, '');
  }

  /**
   * Validate safety number format
   */
  validate(safetyNumber: string): boolean {
    const clean = this.parse(safetyNumber);
    return /^\d{60}$/.test(clean);
  }
}

export const safetyNumberGenerator = new SafetyNumberGenerator();
