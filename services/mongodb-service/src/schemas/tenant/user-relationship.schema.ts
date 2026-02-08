import mongoose, { Schema, Document } from 'mongoose';

export interface IUserRelationship extends Document {
  tenant_id: string;
  requester_id: mongoose.Types.ObjectId;
  recipient_id: mongoose.Types.ObjectId;
  type: 'friend' | 'blocked' | 'following';
  status: 'pending' | 'accepted' | 'rejected';
  created_at: Date;
  updated_at: Date;
}

const UserRelationshipSchema = new Schema({
  tenant_id: { type: String, required: true, index: true },
  requester_id: { type: Schema.Types.ObjectId, required: true },
  recipient_id: { type: Schema.Types.ObjectId, required: true },
  type: { type: String, enum: ['friend', 'blocked', 'following'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

UserRelationshipSchema.index({ tenant_id: 1, requester_id: 1, recipient_id: 1 }, { unique: true });

export const UserRelationshipSchemaDefinition = UserRelationshipSchema;
