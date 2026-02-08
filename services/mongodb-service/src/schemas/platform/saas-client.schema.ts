import mongoose, { Schema, Document } from 'mongoose';

export interface ISaaSClient extends Document {
  company_name: string;
  contact_email: string;
  status: 'active' | 'suspended' | 'trial';
  tier: 'free' | 'pro' | 'enterprise';
  created_at: Date;
  updated_at: Date;
}

const SaaSClientSchema = new Schema({
  company_name: { type: String, required: true },
  contact_email: { type: String, required: true },
  status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'trial' },
  tier: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const SaaSClientModel = mongoose.model<ISaaSClient>('SaaSClient', SaaSClientSchema, 'saas_clients');
