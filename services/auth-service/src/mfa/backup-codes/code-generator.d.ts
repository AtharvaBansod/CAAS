/**
 * Backup Code Generator
 * Phase 2 - Authentication - Task AUTH-010
 *
 * Generates cryptographically secure backup codes
 */
export declare class BackupCodeGenerator {
    private readonly codeLength;
    private readonly excludeChars;
    private readonly charset;
    constructor(codeLength?: number);
    /**
     * Generate multiple backup codes
     */
    generate(count: number): string[];
    /**
     * Generate single backup code
     */
    private generateSingleCode;
    /**
     * Format code with hyphen for readability
     */
    private formatCode;
    /**
     * Normalize code (remove hyphens, uppercase)
     */
    normalizeCode(code: string): string;
    /**
     * Validate code format
     */
    isValidFormat(code: string): boolean;
    /**
     * Get code length
     */
    getCodeLength(): number;
}
