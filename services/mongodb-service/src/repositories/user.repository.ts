import { TenantAwareRepository } from './tenant-aware.repository';
import { ITenantUser, TenantUserSchemaDefinition } from '../schemas/tenant/user.schema';

export class UserRepository extends TenantAwareRepository<ITenantUser> {
  constructor() {
    super('User');
  }

  protected getSchemaDefinition(): any {
    return TenantUserSchemaDefinition;
  }

  async findByEmail(email: string): Promise<ITenantUser | null> {
    return this.findOne({ email });
  }

  async findByExternalId(externalId: string): Promise<ITenantUser | null> {
    return this.findOne({ external_user_id: externalId });
  }
}
