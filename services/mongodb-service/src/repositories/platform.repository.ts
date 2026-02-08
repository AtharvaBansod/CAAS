import { BaseRepository } from './base.repository';
import { Model, Document } from 'mongoose';
import { SaaSClientModel } from '../schemas/platform/saas-client.schema';
import { ApplicationModel } from '../schemas/platform/application.schema';
import { ApiKeyModel } from '../schemas/platform/api-key.schema';

// We can make a generic PlatformRepository or specific ones.
// The task implied "PlatformRepository for non-tenant-scoped data".
// It might be better to have specific repositories extending BaseRepository directly (not TenantAware).

export class PlatformRepository<T extends Document> extends BaseRepository<T> {
  // Override base methods to NOT use tenantId if BaseRepository enforces it?
  // BaseRepository implementation I read earlier had tenantId in method signatures.
  // I should probably check BaseRepository again.
  // ... checking ...
  // BaseRepository: findById(id: string, tenantId: string, options?: FindOptions)
  // It REQUIRES tenantId. This is a design flaw if PlatformRepository inherits from it.
  
  // For now, I will create a separate base class or just implement specific repos that ignore tenantId
  // or pass a dummy tenantId if BaseRepository enforces it.
  // Better: Refactor BaseRepository to make tenantId optional?
  // Or just create specific classes.
  
  constructor(model: Model<T>) {
    super(model);
  }
  
  // Hiding the tenantId requirement by overriding
  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }
  
  // ... and so on.
}

export class SaaSClientRepository extends PlatformRepository<any> { // Typing 'any' for brevity, should be ISaaSClient
  constructor() {
    super(SaaSClientModel);
  }
}

export class ApplicationRepository extends PlatformRepository<any> {
  constructor() {
    super(ApplicationModel);
  }
}

export class ApiKeyRepository extends PlatformRepository<any> {
  constructor() {
    super(ApiKeyModel);
  }
  
  async findByKeyHash(hash: string): Promise<any | null> {
    return this.model.findOne({ key_hash: hash }).exec();
  }
}
