import { EventEmitter } from 'events';

export const TenantLifecycleEvents = {
  PROVISIONED: 'tenant.provisioned',
  UPGRADED: 'tenant.upgraded',
  DOWNGRADED: 'tenant.downgraded',
  SUSPENDED: 'tenant.suspended',
  RESUMED: 'tenant.resumed',
  DELETED: 'tenant.deleted'
};

export class TenantLifecycleEmitter extends EventEmitter {
  private static instance: TenantLifecycleEmitter;

  static getInstance(): TenantLifecycleEmitter {
    if (!this.instance) {
      this.instance = new TenantLifecycleEmitter();
    }
    return this.instance;
  }
}
