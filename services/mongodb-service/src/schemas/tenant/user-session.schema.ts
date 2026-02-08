import mongoose, { Schema, Document } from 'mongoose';

export interface IUserSession extends Document {
  tenant_id: string;
  user_id: mongoose.Types.ObjectId;
  token_hash: string;
  device_id?: string;
  expires_at: Date;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  updated_at: Date;
}

const UserSessionSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, required: true },
  token_hash: { type: String, required: true },
  device_id: { type: String },
  expires_at: { type: Date, required: true },
  ip_address: { type: String },
  user_agent: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

UserSessionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

export const UserSessionSchemaDefinition = UserSessionSchema;
