"use strict";
/**
 * Backup Code Generator
 * Phase 2 - Authentication - Task AUTH-010
 *
 * Generates cryptographically secure backup codes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupCodeGenerator = void 0;
const crypto_1 = require("crypto");
class BackupCodeGenerator {
    codeLength;
    excludeChars = ['0', 'O', 'l', 'I', '1']; // Ambiguous characters
    charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Without ambiguous chars
    constructor(codeLength = 8) {
        this.codeLength = codeLength;
    }
    /**
     * Generate multiple backup codes
     */
    generate(count) {
        const codes = [];
        const uniqueCodes = new Set();
        while (uniqueCodes.size < count) {
            const code = this.generateSingleCode();
            uniqueCodes.add(code);
        }
        return Array.from(uniqueCodes);
    }
    /**
     * Generate single backup code
     */
    generateSingleCode() {
        const bytes = (0, crypto_1.randomBytes)(this.codeLength);
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
    formatCode(code) {
        const half = Math.floor(code.length / 2);
        return `${code.substring(0, half)}-${code.substring(half)}`;
    }
    /**
     * Normalize code (remove hyphens, uppercase)
     */
    normalizeCode(code) {
        return code.replace(/-/g, '').toUpperCase();
    }
    /**
     * Validate code format
     */
    isValidFormat(code) {
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
    getCodeLength() {
        return this.codeLength;
    }
}
exports.BackupCodeGenerator = BackupCodeGenerator;
//# sourceMappingURL=code-generator.js.map
