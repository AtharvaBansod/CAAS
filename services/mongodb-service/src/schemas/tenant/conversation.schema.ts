import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  tenant_id: string;
  type: 'direct' | 'group' | 'channel';
  participants: Array<{
    user_id: mongoose.Types.ObjectId;
    role: 'admin' | 'member';
    joined_at: Date;
  }>;
  title?: string;
  last_message_id?: mongoose.Types.ObjectId;
  last_message_at?: Date;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

const ConversationSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  type: { type: String, enum: ['direct', 'group', 'channel'], required: true },
  participants: [{
    user_id: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joined_at: { type: Date, default: Date.now }
  }],
  title: { type: String },
  last_message_id: { type: Schema.Types.ObjectId },
  last_message_at: { type: Date },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

ConversationSchema.index({ tenant_id: 1, 'participants.user_id': 1 });

export const ConversationSchemaDefinition = ConversationSchema;
