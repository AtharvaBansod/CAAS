import { TenantAwareRepository } from './tenant-aware.repository';
import { Schema, Document } from 'mongoose';

// Placeholder schema for File
const FileSchema = new Schema({
  tenant_id: { type: String, required: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  mime_type: { type: String },
  size: { type: Number },
  uploader_id: { type: Schema.Types.ObjectId }
});

export class FileRepository extends TenantAwareRepository<Document> {
  constructor() {
    super('File');
  }

  protected getSchemaDefinition(): any {
    return FileSchema;
  }
}
