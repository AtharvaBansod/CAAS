import mongoose, { Schema, Document } from 'mongoose';

export interface IUserDevice extends Document {
  tenant_id: string;
  user_id: mongoose.Types.ObjectId;
  device_id: string;
  type: 'ios' | 'android' | 'web' | 'desktop';
  push_token?: string;
  last_active_at: Date;
  created_at: Date;
  updated_at: Date;
}

const UserDeviceSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, required: true },
  device_id: { type: String, required: true },
  type: { type: String, enum: ['ios', 'android', 'web', 'desktop'], required: true },
  push_token: { type: String },
  last_active_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

UserDeviceSchema.index({ tenant_id: 1, user_id: 1, device_id: 1 }, { unique: true });

export const UserDeviceSchemaDefinition = UserDeviceSchema;
