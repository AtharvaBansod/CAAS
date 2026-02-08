import { TenantConnectionFactory } from './tenant-connection-factory';
import { TenantLifecycleEmitter, TenantLifecycleEvents } from './tenant-lifecycle-events';
import { SaaSClientRepository } from '../repositories/platform.repository';
import { IndexManager } from '../indexes/index-manager';

export interface TenantConfig {
  tenantId: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  email: string;
}

export class TenantProvisioner {
  private saasClientRepo: SaaSClientRepository;

  constructor() {
    this.saasClientRepo = new SaaSClientRepository();
  }

  async provision(config: TenantConfig): Promise<void> {
    console.log(`Provisioning tenant ${config.tenantId} (${config.tier})...`);

    // 1. Create SaaS Client record (Platform DB)
    await this.saasClientRepo.create({
      company_name: config.name,
      contact_email: config.email,
      tier: config.tier,
      status: 'active'
    }, undefined); // No tenant context for platform repo

    // 2. Prepare Connection/Database
    const connection = await TenantConnectionFactory.getInstance().getConnection(config.tenantId);
    
    // 3. Create Indexes
    const indexManager = new IndexManager(connection);
    await indexManager.ensureTenantIndexes(config.tenantId);

    // 4. Emit Event
    TenantLifecycleEmitter.getInstance().emit(TenantLifecycleEvents.PROVISIONED, {
      tenantId: config.tenantId,
      tier: config.tier
    });

    console.log(`Tenant ${config.tenantId} provisioned successfully.`);
  }

  async suspend(tenantId: string): Promise<void> {
    // Update status in SaaS Client
    // In real implementation, we would look up the client by some mapping
    console.log(`Suspending tenant ${tenantId}`);
    TenantLifecycleEmitter.getInstance().emit(TenantLifecycleEvents.SUSPENDED, { tenantId });
  }
}
