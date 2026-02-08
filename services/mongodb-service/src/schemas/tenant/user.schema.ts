import mongoose, { Schema, Document } from 'mongoose';

export interface ITenantUser extends Document {
  tenant_id: string;
  external_user_id?: string;
  email?: string;
  display_name: string;
  avatar_url?: string;
  status: 'active' | 'inactive' | 'suspended';
  presence: 'online' | 'offline' | 'away' | 'busy';
  last_seen_at?: Date;
  custom_data?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const TenantUserSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  external_user_id: { type: String, index: true },
  email: { type: String },
  display_name: { type: String, required: true },
  avatar_url: { type: String },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  presence: { type: String, enum: ['online', 'offline', 'away', 'busy'], default: 'offline' },
  last_seen_at: { type: Date },
  custom_data: { type: Schema.Types.Mixed }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

TenantUserSchema.index({ tenant_id: 1, external_user_id: 1 }, { unique: true, sparse: true });

export const TenantUserSchemaDefinition = TenantUserSchema;
// Note: We don't export a Model here because the model name depends on the tenant isolation strategy.
// The repository will create the model using this schema.
