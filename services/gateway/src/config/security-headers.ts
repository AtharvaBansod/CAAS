/**
 * Security Headers Configuration
 * 
 * Environment-specific security header configurations
 */

export interface SecurityHeadersConfig {
  csp: {
    enabled: boolean;
    reportOnly: boolean;
    directives: Record<string, string[]>;
    reportUri?: string;
  };
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  frameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  contentTypeOptions: boolean;
  xssProtection: boolean;
  referrerPolicy: string;
  permissionsPolicy: Record<string, string[]>;
}

/**
 * Production security headers configuration
 */
export const productionConfig: SecurityHeadersConfig = {
  csp: {
    enabled: true,
    reportOnly: false,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"], // TODO: Remove unsafe-inline with nonces
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'wss:', 'https:'],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'upgrade-insecure-requests': [],
    },
    reportUri: '/v1/security/csp-report',
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameOptions: 'DENY',
  contentTypeOptions: true,
  xssProtection: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: [],
  },
};

/**
 * Development security headers configuration (relaxed)
 */
export const developmentConfig: SecurityHeadersConfig = {
  csp: {
    enabled: true,
    reportOnly: true, // Report-only mode for development
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow eval for dev tools
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:', 'http:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'ws:', 'wss:', 'http:', 'https:'],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-ancestors': ["'self'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
    },
    reportUri: '/v1/security/csp-report',
  },
  hsts: {
    enabled: false, // Disabled for local development
    maxAge: 0,
    includeSubDomains: false,
    preload: false,
  },
  frameOptions: 'SAMEORIGIN',
  contentTypeOptions: true,
  xssProtection: true,
  referrerPolicy: 'no-referrer-when-downgrade',
  permissionsPolicy: {
    camera: ['self'],
    microphone: ['self'],
    geolocation: ['self'],
  },
};

/**
 * Get security headers configuration based on environment
 */
export function getSecurityHeadersConfig(): SecurityHeadersConfig {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return productionConfig;
  }
  
  return developmentConfig;
}

/**
 * Override configuration with environment variables
 */
export function applyEnvironmentOverrides(config: SecurityHeadersConfig): SecurityHeadersConfig {
  if (process.env.CSP_REPORT_ONLY !== undefined) {
    config.csp.reportOnly = process.env.CSP_REPORT_ONLY === 'true';
  }
  
  if (process.env.HSTS_MAX_AGE) {
    config.hsts.maxAge = parseInt(process.env.HSTS_MAX_AGE, 10);
  }
  
  if (process.env.CORS_ALLOWED_ORIGINS) {
    // CORS is handled separately but can be configured here
  }
  
  return config;
}
