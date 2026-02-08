/**
 * Backup Code Generator
 * Phase 2 - Authentication - Task AUTH-010
 * 
 * Generates cryptographically secure backup codes
 */

import { randomBytes } from 'crypto';

export class BackupCodeGenerator {
  private readonly codeLength: number;
  private readonly excludeChars = ['0', 'O', 'l', 'I', '1']; // Ambiguous characters
  private readonly charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Without ambiguous chars

  constructor(codeLength: number = 8) {
    this.codeLength = codeLength;
  }

  /**
   * Generate multiple backup codes
   */
  generate(count: number): string[] {
    const codes: string[] = [];
    const uniqueCodes = new Set<string>();

    while (uniqueCodes.size < count) {
      const code = this.generateSingleCode();
      uniqueCodes.add(code);
    }

    return Array.from(uniqueCodes);
  }

  /**
   * Generate single backup code
   */
  private generateSingleCode(): string {
    const bytes = randomBytes(this.codeLength);
    let code = '';

    for (let i = 0; i < this.codeLength; i++) {
      const index = bytes[i] % this.charset.length;
      code += this.charset[index];
    }

    // Format with hyphen: XXXX-XXXX
    return this.formatCode(code);
  }

  /**
   * Format code with hyphen for readability
   */
  private formatCode(code: string): string {
    const half = Math.floor(code.length / 2);
    return `${code.substring(0, half)}-${code.substring(half)}`;
  }

  /**
   * Normalize code (remove hyphens, uppercase)
   */
  normalizeCode(code: string): string {
    return code.replace(/-/g, '').toUpperCase();
  }

  /**
   * Validate code format
   */
  isValidFormat(code: string): boolean {
    const normalized = this.normalizeCode(code);
    
    // Check length
    if (normalized.length !== this.codeLength) {
      return false;
    }

    // Check characters
    for (const char of normalized) {
      if (!this.charset.includes(char)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get code length
   */
  getCodeLength(): number {
    return this.codeLength;
  }
}
