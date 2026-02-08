/**
 * Content Security Policy Builder
 * 
 * Builds CSP header strings with nonce support
 */

import * as crypto from 'crypto';

export interface CSPDirectives {
  [directive: string]: string[];
}

export interface CSPOptions {
  directives: CSPDirectives;
  reportOnly?: boolean;
  reportUri?: string;
  nonce?: string;
}

export class CSPBuilder {
  /**
   * Generate a cryptographic nonce for inline scripts/styles
   */
  static generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Build CSP header string from directives
   */
  static build(options: CSPOptions): string {
    const { directives, nonce } = options;
    const parts: string[] = [];

    for (const [directive, values] of Object.entries(directives)) {
      if (values.length === 0) {
        // Directive with no value (e.g., upgrade-insecure-requests)
        parts.push(directive);
      } else {
        // Add nonce to script-src and style-src if provided
        let directiveValues = [...values];
        
        if (nonce && (directive === 'script-src' || directive === 'style-src')) {
          directiveValues.push(`'nonce-${nonce}'`);
        }
        
        parts.push(`${directive} ${directiveValues.join(' ')}`);
      }
    }

    return parts.join('; ');
  }

  /**
   * Get CSP header name based on report-only mode
   */
  static getHeaderName(reportOnly: boolean): string {
    return reportOnly
      ? 'Content-Security-Policy-Report-Only'
      : 'Content-Security-Policy';
  }

  /**
   * Add report-uri to directives if provided
   */
  static addReportUri(directives: CSPDirectives, reportUri?: string): CSPDirectives {
    if (reportUri) {
      return {
        ...directives,
        'report-uri': [reportUri],
        'report-to': ['csp-endpoint'], // Modern reporting API
      };
    }
    return directives;
  }

  /**
   * Validate CSP directives
   */
  static validate(directives: CSPDirectives): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validDirectives = new Set([
      'default-src',
      'script-src',
      'style-src',
      'img-src',
      'font-src',
      'connect-src',
      'media-src',
      'object-src',
      'frame-src',
      'frame-ancestors',
      'form-action',
      'base-uri',
      'upgrade-insecure-requests',
      'block-all-mixed-content',
      'report-uri',
      'report-to',
    ]);

    for (const directive of Object.keys(directives)) {
      if (!validDirectives.has(directive)) {
        errors.push(`Invalid CSP directive: ${directive}`);
      }
    }

    // Check for unsafe directives in production
    if (process.env.NODE_ENV === 'production') {
      const scriptSrc = directives['script-src'] || [];
      if (scriptSrc.includes("'unsafe-eval'")) {
        errors.push("'unsafe-eval' should not be used in production");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
