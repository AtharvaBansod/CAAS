import { AsyncLocalStorage } from 'async_hooks';

export class TenantContext {
  private static storage = new AsyncLocalStorage<string>();

  static setCurrentTenant(tenantId: string) {
    this.storage.enterWith(tenantId);
  }

  static getCurrentTenant(): string | undefined {
    return this.storage.getStore();
  }

  static runWithTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(tenantId, fn);
  }
}
