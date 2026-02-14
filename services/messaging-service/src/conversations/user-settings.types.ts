import { ObjectId } from 'mongodb';

export interface UserConversationSettings {
    _id?: ObjectId;
    user_id: string;
    conversation_id: string;

    // Mute
    muted_at?: Date;
    muted_until?: Date;
    show_notifications?: boolean;
    mention_exceptions?: boolean;

    // Archive
    is_archived?: boolean;
    archived_at?: Date;

    // Pin
    is_pinned?: boolean;
    pinned_at?: Date;
    pin_order?: number;

    // Delete
    is_deleted?: boolean; // Soft delete for user (hidden from list)
    deleted_at?: Date;
    cleared_history_at?: Date; // Last time history was cleared (messages before this date are hidden)
}

export type MuteStatus = Pick<UserConversationSettings, 'user_id' | 'conversation_id' | 'muted_at' | 'muted_until' | 'show_notifications' | 'mention_exceptions'>;
export type ArchiveStatus = Pick<UserConversationSettings, 'user_id' | 'conversation_id' | 'is_archived' | 'archived_at'>;
export type PinStatus = Pick<UserConversationSettings, 'user_id' | 'conversation_id' | 'is_pinned' | 'pinned_at' | 'pin_order'>;
export type DeleteStatus = Pick<UserConversationSettings, 'user_id' | 'conversation_id' | 'is_deleted' | 'deleted_at' | 'cleared_history_at'>;
