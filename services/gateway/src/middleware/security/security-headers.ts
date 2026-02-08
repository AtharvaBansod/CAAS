/**
 * Security Headers Middleware
 * 
 * Sets comprehensive security headers on all responses
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { SecurityHeadersConfig, getSecurityHeadersConfig, applyEnvironmentOverrides } from '../../config/security-headers';
import { CSPBuilder } from './csp-builder';

export interface SecurityHeadersOptions {
  config?: SecurityHeadersConfig;
  enableNonce?: boolean;
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(options: SecurityHeadersOptions = {}) {
  let config = options.config || getSecurityHeadersConfig();
  config = applyEnvironmentOverrides(config);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Generate nonce for this request if enabled
    const nonce = options.enableNonce ? CSPBuilder.generateNonce() : undefined;
    
    // Store nonce in request for use in templates
    if (nonce) {
      (request as any).cspNonce = nonce;
    }

    // Content-Security-Policy
    if (config.csp.enabled) {
      const directives = CSPBuilder.addReportUri(
        config.csp.directives,
        config.csp.reportUri
      );
      
      const cspHeader = CSPBuilder.build({
        directives,
        reportOnly: config.csp.reportOnly,
        nonce,
      });
      
      const headerName = CSPBuilder.getHeaderName(config.csp.reportOnly);
      reply.header(headerName, cspHeader);
    }

    // Strict-Transport-Security (HSTS)
    if (config.hsts.enabled) {
      const hstsValue = [
        `max-age=${config.hsts.maxAge}`,
        config.hsts.includeSubDomains ? 'includeSubDomains' : '',
        config.hsts.preload ? 'preload' : '',
      ]
        .filter(Boolean)
        .join('; ');
      
      reply.header('Strict-Transport-Security', hstsValue);
    }

    // X-Frame-Options
    reply.header('X-Frame-Options', config.frameOptions);

    // X-Content-Type-Options
    if (config.contentTypeOptions) {
      reply.header('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection (legacy, but still useful for older browsers)
    if (config.xssProtection) {
      reply.header('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    reply.header('Referrer-Policy', config.referrerPolicy);

    // Permissions-Policy (formerly Feature-Policy)
    if (Object.keys(config.permissionsPolicy).length > 0) {
      const permissionsValue = Object.entries(config.permissionsPolicy)
        .map(([feature, allowlist]) => {
          if (allowlist.length === 0) {
            return `${feature}=()`;
          }
          return `${feature}=(${allowlist.join(' ')})`;
        })
        .join(', ');
      
      reply.header('Permissions-Policy', permissionsValue);
    }

    // X-Permitted-Cross-Domain-Policies
    reply.header('X-Permitted-Cross-Domain-Policies', 'none');

    // Cross-Origin-Embedder-Policy
    reply.header('Cross-Origin-Embedder-Policy', 'require-corp');

    // Cross-Origin-Opener-Policy
    reply.header('Cross-Origin-Opener-Policy', 'same-origin');

    // Cross-Origin-Resource-Policy
    reply.header('Cross-Origin-Resource-Policy', 'same-origin');
  };
}

/**
 * Get CSP nonce from request
 */
export function getCspNonce(request: FastifyRequest): string | undefined {
  return (request as any).cspNonce;
}
