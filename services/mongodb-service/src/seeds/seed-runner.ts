import { getConnectionManager } from '../connections';
import { SeedConfig } from './seed-config';
import { PlatformGenerator } from './data-generators/platform.generator';
import { UserGenerator } from './data-generators/user.generator';
import { ConversationGenerator } from './data-generators/conversation.generator';
import { MessageGenerator } from './data-generators/message.generator';
import { FileGenerator } from './data-generators/file.generator';
import { GroupGenerator } from './data-generators/group.generator';

/**
 * Seed Runner
 * Orchestrates the database seeding process
 */
export class SeedRunner {
  private connection = getConnectionManager();
  private config: SeedConfig;

  constructor(config?: Partial<SeedConfig>) {
    this.config = {
      tenants: 3,
      usersPerTenant: 50,
      conversationsPerUser: 10,
      messagesPerConversation: 100,
      filesPerTenant: 200,
      groupsPerTenant: 15,
      ...config,
    };
  }

  /**
   * Run all seeds
   */
  async runAll(): Promise<void> {
    console.log('🌱 Starting database seeding...');

    try {
      // Ensure connection is established
      if (!this.connection.isConnected()) {
        await this.connection.connect();
      }

      console.log(`📊 Seed Configuration:`, this.config);

      // Clear existing data (if configured)
      await this.clearData();

      // Generate platform data
      console.log('\n🏢 Generating platform data...');
      const platformGenerator = new PlatformGenerator();
      const platformData = await platformGenerator.generate();
      console.log(`✅ Generated ${platformData.clients.length} SAAS clients`);

      // Generate tenant data for each client
      for (const client of platformData.clients) {
        console.log(`\n👥 Generating data for tenant: ${client.name}...`);

        // Generate users
        const userGenerator = new UserGenerator();
        const users = await userGenerator.generate(client.id, this.config.usersPerTenant);
        console.log(`✅ Generated ${users.length} users`);

        // Generate groups
        const groupGenerator = new GroupGenerator();
        const groups = await groupGenerator.generate(client.id, this.config.groupsPerTenant, users);
        console.log(`✅ Generated ${groups.length} groups`);

        // Generate conversations
        const conversationGenerator = new ConversationGenerator();
        const conversations = await conversationGenerator.generate(
          client.id,
          this.config.conversationsPerUser,
          users,
          groups
        );
        console.log(`✅ Generated ${conversations.length} conversations`);

        // Generate messages
        const messageGenerator = new MessageGenerator();
        const messages = await messageGenerator.generate(
          conversations,
          this.config.messagesPerConversation,
          users
        );
        console.log(`✅ Generated ${messages.length} messages`);

        // Generate files
        const fileGenerator = new FileGenerator();
        const files = await fileGenerator.generate(
          client.id,
          this.config.filesPerTenant,
          users
        );
        console.log(`✅ Generated ${files.length} files`);
      }

      console.log('\n🎉 Database seeding completed successfully!');

      // Print summary
      await this.printSummary();

    } catch (error) {
      console.error('❌ Seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clear all seed data
   */
  async clearData(): Promise<void> {
    console.log('🧹 Clearing existing seed data...');

    const db = this.connection.getConnection();

    // Clear in dependency order
    const collections = [
      'messages',
      'conversations',
      'user_relationships',
      'groups',
      'files',
      'users',
      'api_keys',
      'applications',
      'clients',
    ];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteMany({});
        if (result.deletedCount > 0) {
          console.log(`  🗑️  Cleared ${result.deletedCount} documents from ${collectionName}`);
        }
      } catch (error) {
        console.warn(`  ⚠️  Could not clear ${collectionName}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Generate platform data only
   */
  async runPlatformOnly(): Promise<void> {
    console.log('🏢 Generating platform data only...');

    try {
      if (!this.connection.isConnected()) {
        await this.connection.connect();
      }

      const platformGenerator = new PlatformGenerator();
      const platformData = await platformGenerator.generate();

      console.log(`✅ Generated ${platformData.clients.length} SAAS clients`);
      console.log(`✅ Generated ${platformData.applications.length} applications`);
      console.log(`✅ Generated ${platformData.apiKeys.length} API keys`);

    } catch (error) {
      console.error('❌ Platform seeding failed:', error);
      throw error;
    }
  }

  /**
   * Generate data for specific tenant
   */
  async runForTenant(tenantId: string): Promise<void> {
    console.log(`👥 Generating data for tenant: ${tenantId}...`);

    try {
      if (!this.connection.isConnected()) {
        await this.connection.connect();
      }

      // Generate users
      const userGenerator = new UserGenerator();
      const users = await userGenerator.generate(tenantId, this.config.usersPerTenant);
      console.log(`✅ Generated ${users.length} users`);

      // Generate groups
      const groupGenerator = new GroupGenerator();
      const groups = await groupGenerator.generate(tenantId, this.config.groupsPerTenant, users);
      console.log(`✅ Generated ${groups.length} groups`);

      // Generate conversations
      const conversationGenerator = new ConversationGenerator();
      const conversations = await conversationGenerator.generate(
        tenantId,
        this.config.conversationsPerUser,
        users,
        groups
      );
      console.log(`✅ Generated ${conversations.length} conversations`);

      // Generate messages
      const messageGenerator = new MessageGenerator();
      const messages = await messageGenerator.generate(
        conversations,
        this.config.messagesPerConversation,
        users
      );
      console.log(`✅ Generated ${messages.length} messages`);

      // Generate files
      const fileGenerator = new FileGenerator();
      const files = await fileGenerator.generate(tenantId, this.config.filesPerTenant, users);
      console.log(`✅ Generated ${files.length} files`);

    } catch (error) {
      console.error('❌ Tenant seeding failed:', error);
      throw error;
    }
  }

  /**
   * Print seeding summary
   */
  private async printSummary(): Promise<void> {
    const db = this.connection.getConnection();

    console.log('\n📊 Seeding Summary:');
    console.log('==================');

    const collections = [
      'clients',
      'applications',
      'api_keys',
      'users',
      'groups',
      'conversations',
      'messages',
      'files',
    ];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        console.log(`  ${collectionName}: ${count.toLocaleString()} documents`);
      } catch (error) {
        console.log(`  ${collectionName}: Error counting documents`);
      }
    }

    console.log('==================');
  }

  /**
   * Validate seed data integrity
   */
  async validate(): Promise<boolean> {
    console.log('🔍 Validating seed data integrity...');

    try {
      const db = this.connection.getConnection();

      // Check if required collections exist and have data
      const requiredCollections = ['clients', 'users', 'conversations', 'messages'];

      for (const collectionName of requiredCollections) {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();

        if (count === 0) {
          console.error(`❌ Collection ${collectionName} is empty`);
          return false;
        }

        console.log(`✅ ${collectionName}: ${count} documents`);
      }

      console.log('✅ Seed data validation passed');
      return true;

    } catch (error) {
      console.error('❌ Seed data validation failed:', error);
      return false;
    }
  }
}
