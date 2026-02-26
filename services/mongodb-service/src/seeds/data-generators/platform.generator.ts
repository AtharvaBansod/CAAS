import { getConnectionManager } from '../../connections';
import { v4 as uuidv4 } from 'uuid';

/**
 * Platform Data Generator
 * Generates SAAS clients, applications, and API keys
 */
export class PlatformGenerator {
  private connection = getConnectionManager();

  /**
   * Generate platform data
   */
  async generate() {
    const db = this.connection.getConnection();

    // Generate SAAS clients
    const clients = await this.generateClients();

    // Generate applications for each client
    const applications = await this.generateApplications(clients);

    // Generate API keys for each application
    const apiKeys = await this.generateApiKeys(applications);

    return {
      clients,
      applications,
      apiKeys,
    };
  }

  /**
   * Generate SAAS clients
   */
  private async generateClients() {
    const db = this.connection.getConnection();
    const clientsCollection = db.collection('clients');

    const clientData = [
      {
        _id: uuidv4(),
        name: 'TechCorp Inc.',
        domain: 'techcorp.com',
        tier: 'enterprise',
        status: 'active',
        settings: {
          maxUsers: 10000,
          maxStorageGB: 1000,
          features: ['video', 'screen-share', 'whiteboard'],
        },
        billing: {
          plan: 'enterprise',
          price: 999.99,
          currency: 'USD',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: uuidv4(),
        name: 'StartupHub',
        domain: 'startuphub.io',
        tier: 'pro',
        status: 'active',
        settings: {
          maxUsers: 1000,
          maxStorageGB: 100,
          features: ['video', 'file-share'],
        },
        billing: {
          plan: 'pro',
          price: 99.99,
          currency: 'USD',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: uuidv4(),
        name: 'FreelanceFlow',
        domain: 'freelanceflow.app',
        tier: 'free',
        status: 'active',
        settings: {
          maxUsers: 100,
          maxStorageGB: 10,
          features: ['text'],
        },
        billing: {
          plan: 'free',
          price: 0,
          currency: 'USD',
          nextBillingDate: null,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await clientsCollection.insertMany(clientData);
    return clientData;
  }

  /**
   * Generate applications for clients
   */
  private async generateApplications(clients: any[]) {
    const db = this.connection.getConnection();
    const applicationsCollection = db.collection('applications');

    const applications = [];

    for (const client of clients) {
      const appCount = client.tier === 'enterprise' ? 3 : client.tier === 'pro' ? 2 : 1;

      for (let i = 0; i < appCount; i++) {
        const application = {
          _id: uuidv4(),
          clientId: client._id,
          name: `${client.name} App ${i + 1}`,
          description: `Application for ${client.name}`,
          domain: `app${i + 1}.${client.domain}`,
          callbackUrls: [`https://app${i + 1}.${client.domain}/auth/callback`],
          allowedOrigins: [`https://app${i + 1}.${client.domain}`],
          settings: {
            sessionTimeout: 3600,
            maxConcurrentSessions: 5,
            enableWebhooks: client.tier !== 'free',
          },
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        applications.push(application);
      }
    }

    await applicationsCollection.insertMany(applications);
    return applications;
  }

  /**
   * Generate API keys for applications
   */
  private async generateApiKeys(applications: any[]) {
    const db = this.connection.getConnection();
    const apiKeysCollection = db.collection('api_keys');

    const apiKeys = [];

    for (const app of applications) {
      // Generate primary and secondary API keys
      for (let i = 0; i < 2; i++) {
        const apiKey = {
          _id: uuidv4(),
          applicationId: app._id,
          name: `${app.name} Key ${i === 0 ? 'Primary' : 'Secondary'}`,
          keyHash: this.generateApiKeyHash(),
          permissions: ['read', 'write', 'admin'],
          rateLimit: {
            requestsPerMinute: app.clientId.includes('enterprise') ? 10000 : 1000,
            burstLimit: app.clientId.includes('enterprise') ? 1000 : 100,
          },
          status: 'active',
          lastUsed: null,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        apiKeys.push(apiKey);
      }
    }

    await apiKeysCollection.insertMany(apiKeys);
    return apiKeys;
  }

  /**
   * Generate API key hash
   */
  private generateApiKeyHash(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }
}
