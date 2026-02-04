import { Admin } from 'kafkajs';
import { KafkaClient } from '../client/kafka-client';

export interface ACLEntry {
  resourceType: 'topic' | 'group' | 'cluster' | 'transactionalId' | 'delegationToken';
  resourceName: string;
  operation: 'Read' | 'Write' | 'Create' | 'Delete' | 'Alter' | 'Describe' | 'ClusterAction' | 'All';
  principal: string;
  host: string;
  permission: 'Allow' | 'Deny';
}

export interface CreateProducerACLOptions {
  topic: string;
  principal: string;
  host?: string;
}

export interface CreateConsumerACLOptions {
  topic: string;
  group: string;
  principal: string;
  host?: string;
}

export interface CreateAdminACLOptions {
  principal: string;
  host?: string;
}

export class ACLManager {
  private kafkaClient: KafkaClient;
  private admin: Admin | null = null;

  constructor(kafkaClient?: KafkaClient) {
    this.kafkaClient = kafkaClient || KafkaClient.getInstance();
  }

  private async getAdmin(): Promise<Admin> {
    if (!this.admin) {
      this.admin = await this.kafkaClient.createAdmin();
    }
    return this.admin;
  }

  /**
   * Create ACL for producer to write to a topic
   */
  public async createProducerACL(options: CreateProducerACLOptions): Promise<void> {
    const { topic, principal, host = '*' } = options;
    const admin = await this.getAdmin();

    const acls: ACLEntry[] = [
      {
        resourceType: 'topic',
        resourceName: topic,
        operation: 'Write',
        principal,
        host,
        permission: 'Allow'
      },
      {
        resourceType: 'topic',
        resourceName: topic,
        operation: 'Describe',
        principal,
        host,
        permission: 'Allow'
      },
      {
        resourceType: 'cluster',
        resourceName: 'kafka-cluster',
        operation: 'Describe',
        principal,
        host,
        permission: 'Allow'
      }
    ];

    await this.applyACLs(acls);
    console.log(`✅ Created producer ACL for ${principal} on topic ${topic}`);
  }

  /**
   * Create ACL for consumer to read from a topic and join consumer group
   */
  public async createConsumerACL(options: CreateConsumerACLOptions): Promise<void> {
    const { topic, group, principal, host = '*' } = options;
    const admin = await this.getAdmin();

    const acls: ACLEntry[] = [
      {
        resourceType: 'topic',
        resourceName: topic,
        operation: 'Read',
        principal,
        host,
        permission: 'Allow'
      },
      {
        resourceType: 'topic',
        resourceName: topic,
        operation: 'Describe',
        principal,
        host,
        permission: 'Allow'
      },
      {
        resourceType: 'group',
        resourceName: group,
        operation: 'Read',
        principal,
        host,
        permission: 'Allow'
      }
    ];

    await this.applyACLs(acls);
    console.log(`✅ Created consumer ACL for ${principal} on topic ${topic}, group ${group}`);
  }

  /**
   * Create ACL for admin with full cluster access
   */
  public async createAdminACL(options: CreateAdminACLOptions): Promise<void> {
    const { principal, host = '*' } = options;
    const admin = await this.getAdmin();

    const acls: ACLEntry[] = [
      {
        resourceType: 'cluster',
        resourceName: 'kafka-cluster',
        operation: 'All',
        principal,
        host,
        permission: 'Allow'
      },
      {
        resourceType: 'topic',
        resourceName: '*',
        operation: 'All',
        principal,
        host,
        permission: 'Allow'
      },
      {
        resourceType: 'group',
        resourceName: '*',
        operation: 'All',
        principal,
        host,
        permission: 'Allow'
      }
    ];

    await this.applyACLs(acls);
    console.log(`✅ Created admin ACL for ${principal}`);
  }

  /**
   * Create ACL for service with specific topic permissions
   */
  public async createServiceACL(options: {
    principal: string;
    topics: string[];
    operations: Array<'Read' | 'Write' | 'Describe'>;
    groups?: string[];
    host?: string;
  }): Promise<void> {
    const { principal, topics, operations, groups = [], host = '*' } = options;
    const admin = await this.getAdmin();

    const acls: ACLEntry[] = [];

    // Topic ACLs
    for (const topic of topics) {
      for (const operation of operations) {
        acls.push({
          resourceType: 'topic',
          resourceName: topic,
          operation,
          principal,
          host,
          permission: 'Allow'
        });
      }
    }

    // Group ACLs
    for (const group of groups) {
      acls.push({
        resourceType: 'group',
        resourceName: group,
        operation: 'Read',
        principal,
        host,
        permission: 'Allow'
      });
    }

    // Cluster describe permission
    acls.push({
      resourceType: 'cluster',
      resourceName: 'kafka-cluster',
      operation: 'Describe',
      principal,
      host,
      permission: 'Allow'
    });

    await this.applyACLs(acls);
    console.log(`✅ Created service ACL for ${principal} on topics: ${topics.join(', ')}`);
  }

  /**
   * List all ACLs in the cluster
   */
  public async listACLs(): Promise<ACLEntry[]> {
    const admin = await this.getAdmin();
    
    try {
      const acls = await admin.describeAcls({
        resourceType: 'any',
        resourceName: undefined,
        principal: undefined,
        host: undefined,
        operation: 'any',
        permissionType: 'any'
      });

      return acls.resources.flatMap(resource =>
        resource.acls.map(acl => ({
          resourceType: resource.resourceType as ACLEntry['resourceType'],
          resourceName: resource.resourceName,
          operation: acl.operation as ACLEntry['operation'],
          principal: acl.principal,
          host: acl.host,
          permission: acl.permissionType as ACLEntry['permission']
        }))
      );
    } catch (error) {
      console.error('❌ Failed to list ACLs:', error);
      throw error;
    }
  }

  /**
   * Delete a specific ACL
   */
  public async deleteACL(acl: ACLEntry): Promise<void> {
    const admin = await this.getAdmin();

    try {
      await admin.deleteAcls({
        resourceType: acl.resourceType,
        resourceName: acl.resourceName,
        principal: acl.principal,
        host: acl.host,
        operation: acl.operation,
        permissionType: acl.permission
      });

      console.log(`✅ Deleted ACL for ${acl.principal} on ${acl.resourceType}:${acl.resourceName}`);
    } catch (error) {
      console.error('❌ Failed to delete ACL:', error);
      throw error;
    }
  }

  /**
   * Delete all ACLs for a principal
   */
  public async deleteAllACLsForPrincipal(principal: string): Promise<void> {
    const acls = await this.listACLs();
    const principalACLs = acls.filter(acl => acl.principal === principal);

    for (const acl of principalACLs) {
      await this.deleteACL(acl);
    }

    console.log(`✅ Deleted all ACLs for principal: ${principal}`);
  }

  /**
   * Check if principal has permission for resource
   */
  public async hasPermission(
    principal: string,
    resourceType: ACLEntry['resourceType'],
    resourceName: string,
    operation: ACLEntry['operation']
  ): Promise<boolean> {
    const acls = await this.listACLs();
    
    return acls.some(acl =>
      acl.principal === principal &&
      acl.resourceType === resourceType &&
      acl.resourceName === resourceName &&
      acl.operation === operation &&
      acl.permission === 'Allow'
    );
  }

  private async applyACLs(acls: ACLEntry[]): Promise<void> {
    const admin = await this.getAdmin();

    for (const acl of acls) {
      try {
        await admin.createAcls({
          resourceType: acl.resourceType,
          resourceName: acl.resourceName,
          principal: acl.principal,
          host: acl.host,
          operation: acl.operation,
          permissionType: acl.permission
        });
      } catch (error) {
        console.error(`❌ Failed to create ACL for ${acl.principal}:`, error);
        throw error;
      }
    }
  }

  /**
   * Initialize default ACLs for CAAS platform
   */
  public async initializeDefaultACLs(): Promise<void> {
    console.log('🔐 Initializing default ACLs for CAAS platform...');

    // Admin ACLs
    await this.createAdminACL({ principal: 'admin' });

    // Producer ACLs
    await this.createProducerACL({
      topic: 'platform.events',
      principal: 'producer'
    });

    await this.createProducerACL({
      topic: 'platform.audit',
      principal: 'producer'
    });

    await this.createProducerACL({
      topic: 'platform.notifications',
      principal: 'producer'
    });

    // Consumer ACLs
    await this.createConsumerACL({
      topic: 'platform.events',
      group: 'notification-service',
      principal: 'consumer'
    });

    await this.createConsumerACL({
      topic: 'platform.notifications',
      group: 'notification-service',
      principal: 'consumer'
    });

    // Service-specific ACLs
    await this.createServiceACL({
      principal: 'gateway',
      topics: ['platform.events', 'platform.audit', 'platform.notifications'],
      operations: ['Write', 'Describe']
    });

    await this.createServiceACL({
      principal: 'notification',
      topics: ['platform.events', 'platform.notifications'],
      operations: ['Read', 'Describe'],
      groups: ['notification-service']
    });

    // Internal topics ACLs
    const internalTopics = [
      'internal.dlq',
      'internal.retry',
      'internal.retry.1min',
      'internal.retry.5min',
      'internal.retry.30min'
    ];

    await this.createServiceACL({
      principal: 'producer',
      topics: internalTopics,
      operations: ['Write', 'Describe']
    });

    await this.createServiceACL({
      principal: 'consumer',
      topics: internalTopics,
      operations: ['Read', 'Describe']
    });

    console.log('✅ Default ACLs initialized successfully');
  }
}

// Export singleton instance
export const aclManager = new ACLManager();
