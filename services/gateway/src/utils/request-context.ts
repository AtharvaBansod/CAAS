import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  requestId: string;
  userId?: string;
  tenantId?: string;
  roles?: string[];
}

export class RequestContext {
  private static storage = new AsyncLocalStorage<RequestContextData>();

  static run(data: RequestContextData, callback: () => void) {
    this.storage.run(data, callback);
  }

  static get(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  static getRequestId(): string | undefined {
    return this.get()?.requestId;
  }

  static getUserId(): string | undefined {
    return this.get()?.userId;
  }

  static getTenantId(): string | undefined {
    return this.get()?.tenantId;
  }
}
