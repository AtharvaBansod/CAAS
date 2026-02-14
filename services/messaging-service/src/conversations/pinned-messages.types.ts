import { ObjectId } from 'mongodb';

export interface PinnedMessage {
  _id: ObjectId;
  id: string;
  conversation_id: string;
  message_id: string;
  pinned_by: string;
  pinned_at: Date;
  order: number; // To maintain the order of pinned messages
}