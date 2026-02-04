/**
 * MongoDB Database Constants
 */

/**
 * Database Names
 */
export const DB_NAMES = {
  PLATFORM: 'caas_platform',
  TENANTS: 'caas_platform_tenants',
  BILLING: 'caas_platform_billing',
  ANALYTICS: 'caas_platform_analytics',
} as const;

/**
 * Platform Collections (for SAAS management)
 */
export const PLATFORM_COLLECTIONS = {
  SAAS_CLIENTS: 'saas_clients',
  APPLICATIONS: 'applications',
  API_KEYS: 'api_keys',
  WEBHOOKS: 'webhooks',
  RATE_LIMITS: 'rate_limits',
  IP_WHITELIST: 'ip_whitelist',
} as const;

/**
 * Tenant Collections (per-tenant data)
 */
export const TENANT_COLLECTIONS = {
  USERS: 'users',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  FILES: 'files',
  USER_RELATIONSHIPS: 'user_relationships',
  GROUPS: 'groups',
  NOTIFICATIONS: 'notifications',
  PRESENCE: 'presence',
  TYPING_INDICATORS: 'typing_indicators',
  READ_RECEIPTS: 'read_receipts',
} as const;

/**
 * Billing Collections
 */
export const BILLING_COLLECTIONS = {
  SUBSCRIPTIONS: 'subscriptions',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  USAGE_METRICS: 'usage_metrics',
  BILLING_EVENTS: 'billing_events',
} as const;

/**
 * Connection Settings
 */
export const CONNECTION_SETTINGS = {
  DEFAULT_MIN_POOL_SIZE: 10,
  DEFAULT_MAX_POOL_SIZE: 100,
  DEFAULT_MAX_IDLE_TIME_MS: 30000,
  DEFAULT_WAIT_QUEUE_TIMEOUT_MS: 10000,
  DEFAULT_SERVER_SELECTION_TIMEOUT_MS: 5000,
  DEFAULT_SOCKET_TIMEOUT_MS: 45000,
  DEFAULT_CONNECT_TIMEOUT_MS: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

/**
 * Query Settings
 */
export const QUERY_SETTINGS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_SORT_FIELD: 'created_at',
  DEFAULT_SORT_ORDER: -1 as const, // -1 for DESC, 1 for ASC
} as const;

/**
 * Index Settings
 */
export const INDEX_SETTINGS = {
  BACKGROUND: true,
  UNIQUE: true,
  SPARSE: true,
} as const;

/**
 * Soft Delete Field
 */
export const SOFT_DELETE_FIELD = 'deleted_at';

/**
 * Tenant Isolation Field
 */
export const TENANT_ID_FIELD = 'tenant_id';

/**
 * Common Field Names
 */
export const COMMON_FIELDS = {
  ID: '_id',
  TENANT_ID: TENANT_ID_FIELD,
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  DELETED_AT: SOFT_DELETE_FIELD,
  CREATED_BY: 'created_by',
  UPDATED_BY: 'updated_by',
  VERSION: '__v',
} as const;
