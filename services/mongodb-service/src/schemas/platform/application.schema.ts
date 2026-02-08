import mongoose, { Schema, Document } from 'mongoose';

export interface IApplication extends Document {
  client_id: mongoose.Types.ObjectId;
  name: string;
  domains: string[];
  settings: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const ApplicationSchema = new Schema({
  client_id: { type: Schema.Types.ObjectId, ref: 'SaaSClient', required: true },
  name: { type: String, required: true },
  domains: [{ type: String }],
  settings: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const ApplicationModel = mongoose.model<IApplication>('Application', ApplicationSchema, 'applications');
