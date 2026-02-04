/**
 * Seed Configuration
 * Defines quantities and options for data generation
 */
export interface SeedConfig {
  tenants: number;
  usersPerTenant: number;
  conversationsPerUser: number;
  messagesPerConversation: number;
  filesPerTenant: number;
  groupsPerTenant: number;
}

/**
 * Default seed configuration
 */
export const DEFAULT_SEED_CONFIG: SeedConfig = {
  tenants: 3,
  usersPerTenant: 50,
  conversationsPerUser: 10,
  messagesPerConversation: 100,
  filesPerTenant: 200,
  groupsPerTenant: 15,
};

/**
 * Development seed configuration (smaller dataset)
 */
export const DEV_SEED_CONFIG: SeedConfig = {
  tenants: 1,
  usersPerTenant: 10,
  conversationsPerUser: 5,
  messagesPerConversation: 20,
  filesPerTenant: 25,
  groupsPerTenant: 3,
};

/**
 * Test seed configuration (minimal dataset)
 */
export const TEST_SEED_CONFIG: SeedConfig = {
  tenants: 1,
  usersPerTenant: 3,
  conversationsPerUser: 2,
  messagesPerConversation: 5,
  filesPerTenant: 5,
  groupsPerTenant: 1,
};

/**
 * Get seed configuration based on environment
 */
export function getSeedConfig(): SeedConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'development':
      return DEV_SEED_CONFIG;
    case 'test':
      return TEST_SEED_CONFIG;
    case 'production':
      throw new Error('Seeding not allowed in production');
    default:
      return DEFAULT_SEED_CONFIG;
  }
}
