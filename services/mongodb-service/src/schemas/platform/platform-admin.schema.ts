import mongoose, { Schema, Document } from 'mongoose';

export interface IPlatformAdmin extends Document {
  email: string;
  password_hash: string;
  name: string;
  role: 'super_admin' | 'support' | 'viewer';
  mfa_enabled: boolean;
  mfa_secret?: string;
  created_at: Date;
  updated_at: Date;
}

const PlatformAdminSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'support', 'viewer'], default: 'viewer' },
  mfa_enabled: { type: Boolean, default: false },
  mfa_secret: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const PlatformAdminModel = mongoose.model<IPlatformAdmin>('PlatformAdmin', PlatformAdminSchema, 'platform_admins');
