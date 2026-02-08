import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  tenant_id: string;
  conversation_id: mongoose.Types.ObjectId;
  sender_id: mongoose.Types.ObjectId;
  type: 'text' | 'image' | 'file' | 'system';
  content: string;
  attachments?: any[];
  read_by?: Array<{
    user_id: mongoose.Types.ObjectId;
    read_at: Date;
  }>;
  created_at: Date;
  updated_at: Date;
}

const MessageSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  conversation_id: { type: Schema.Types.ObjectId, required: true, index: true },
  sender_id: { type: Schema.Types.ObjectId, required: true, index: true },
  type: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
  content: { type: String },
  attachments: [{ type: Schema.Types.Mixed }],
  read_by: [{
    user_id: { type: Schema.Types.ObjectId },
    read_at: { type: Date }
  }]
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

MessageSchema.index({ tenant_id: 1, conversation_id: 1, created_at: -1 });

export const MessageSchemaDefinition = MessageSchema;
