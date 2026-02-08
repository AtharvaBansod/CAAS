import { TenantAwareRepository } from './tenant-aware.repository';
import { Schema, Document } from 'mongoose';

// Placeholder schema for Group
const GroupSchema = new Schema({
  tenant_id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  members: [{ type: Schema.Types.ObjectId }]
});

export class GroupRepository extends TenantAwareRepository<Document> {
  constructor() {
    super('Group');
  }

  protected getSchemaDefinition(): any {
    return GroupSchema;
  }
}
