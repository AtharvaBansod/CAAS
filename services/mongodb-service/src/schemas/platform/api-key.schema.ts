import mongoose, { Schema, Document } from 'mongoose';

export interface IApiKey extends Document {
  client_id: mongoose.Types.ObjectId;
  name: string;
  key_hash: string;
  prefix: string;
  permissions: string[];
  last_used_at?: Date;
  expires_at?: Date;
  status: 'active' | 'revoked';
  created_at: Date;
  updated_at: Date;
}

const ApiKeySchema = new Schema({
  client_id: { type: Schema.Types.ObjectId, ref: 'SaaSClient', required: true },
  name: { type: String, required: true },
  key_hash: { type: String, required: true },
  prefix: { type: String, required: true },
  permissions: [{ type: String }],
  last_used_at: { type: Date },
  expires_at: { type: Date },
  status: { type: String, enum: ['active', 'revoked'], default: 'active' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const ApiKeyModel = mongoose.model<IApiKey>('ApiKey', ApiKeySchema, 'api_keys');
