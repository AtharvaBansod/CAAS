# Messages Schema

> **Collection**: `messages`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores individual chat messages with E2E encryption support

---

## Overview

Messages are the core data entity. They support:
- Text, media, files, voice notes
- E2E encryption (content stored encrypted)
- Reactions, replies/threads
- Edit and delete history
- Delivery/read status

---

## Schema Definition

```javascript
// messages collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === IDENTIFICATION ===
  message_id: String,                 // "msg_abc123xyz"
  conversation_id: ObjectId,          // Reference to conversations._id
  
  // === SENDER ===
  sender: {
    user_id: ObjectId,                // Reference to users._id
    external_user_id: String,         // Denormalized
    display_name: String,             // Denormalized (at time of sending)
    avatar_url: String,               // Denormalized
    device_id: ObjectId               // Which device sent this
  },
  
  // === CONTENT ===
  content: {
    type: String,                     // 'text' | 'image' | 'video' | 'audio' | 'file' | 'voice' | 'location' | 'contact' | 'sticker' | 'system'
    
    // === ENCRYPTED CONTENT ===
    // For E2E encryption, actual content is encrypted client-side
    encrypted_data: String,           // Base64 encrypted payload
    
    // Per-recipient encrypted keys (for group messages)
    encrypted_keys: [{
      user_id: ObjectId,
      device_id: ObjectId,
      encrypted_key: String           // Key encrypted with recipient's public key
    }],
    
    // === PLAINTEXT FIELDS (non-E2E or system messages) ===
    text: String,                     // Plain text content (if not E2E)
    
    // === MEDIA REFERENCE ===
    media: {
      file_id: ObjectId,              // Reference to files collection
      url: String,                    // CDN URL (may be signed/temporary)
      thumbnail_url: String,
      mime_type: String,
      file_name: String,
      file_size: Number,              // Bytes
      
      // Image/Video specific
      dimensions: {
        width: Number,
        height: Number,
        duration: Number              // Seconds (for video/audio)
      },
      
      // Voice message specific
      waveform: [Number],             // Audio waveform data
      
      // Processing status
      processing_status: String       // 'pending' | 'processing' | 'ready' | 'failed'
    },
    
    // === LOCATION ===
    location: {
      latitude: Number,
      longitude: Number,
      name: String,                   // "Starbucks Downtown"
      address: String
    },
    
    // === CONTACT SHARE ===
    contact: {
      user_id: ObjectId,              // If internal user
      name: String,
      phone: String,
      email: String
    },
    
    // === LINK PREVIEW ===
    link_preview: {
      url: String,
      title: String,
      description: String,
      image_url: String,
      site_name: String
    },
    
    // === MENTIONS ===
    mentions: [{
      user_id: ObjectId,
      display_name: String,
      offset: Number,                 // Character position in text
      length: Number
    }],
    
    // === FORMATTING ===
    formatting: [{
      type: String,                   // 'bold' | 'italic' | 'code' | 'link' | 'strikethrough'
      offset: Number,
      length: Number,
      url: String                     // For link type
    }]
  },
  
  // === THREAD/REPLY ===
  thread: {
    parent_message_id: ObjectId,      // Message being replied to
    root_message_id: ObjectId,        // Original thread starter
    reply_count: Number,              // Count of replies (if this is root)
    is_thread_root: Boolean           // Is this a thread starter
  },
  
  // === FORWARD ===
  forwarded: {
    is_forwarded: Boolean,
    original_message_id: ObjectId,
    original_sender_name: String,
    original_conversation_id: ObjectId,
    forwarded_at: Date
  },
  
  // === REACTIONS (Summary) ===
  reactions_summary: {
    total_count: Number,
    by_emoji: {                       // { "👍": 5, "❤️": 3 }
      type: Map,
      of: Number
    },
    user_reacted: [ObjectId]          // Quick check: has current user reacted
  },
  
  // === DELIVERY STATUS ===
  delivery: {
    status: String,                   // 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
    sent_at: Date,
    delivered_to: [{
      user_id: ObjectId,
      device_id: ObjectId,
      delivered_at: Date
    }],
    read_by: [{
      user_id: ObjectId,
      read_at: Date
    }],
    failed_reason: String
  },
  
  // === EDIT HISTORY ===
  edit: {
    is_edited: Boolean,
    edited_at: Date,
    edit_count: Number,
    original_content: String,         // Original encrypted content
    history: [{
      content: String,
      edited_at: Date
    }]
  },
  
  // === DELETION ===
  deletion: {
    is_deleted: Boolean,
    deleted_at: Date,
    deleted_by: ObjectId,             // Who deleted
    delete_type: String,              // 'sender' | 'admin' | 'system'
    deleted_for: String               // 'everyone' | 'self'
  },
  
  // === PINNED ===
  is_pinned: Boolean,
  pinned_at: Date,
  pinned_by: ObjectId,
  
  // === SYSTEM MESSAGE ===
  system: {
    type: String,                     // 'user_joined' | 'user_left' | 'group_created' | 'name_changed' | ...
    data: Object                      // Type-specific data
  },
  
  // === METADATA ===
  metadata: {
    client_message_id: String,        // Client-generated ID for deduplication
    reply_to_story_id: ObjectId,      // If replying to a story
    via_bot: Boolean,
    bot_id: ObjectId
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  expires_at: Date                    // For disappearing messages
}
```

---

## Content Types

| Type | Description | Fields Used |
|------|-------------|-------------|
| `text` | Plain text message | `text`, `mentions`, `formatting` |
| `image` | Photo | `media.url`, `media.dimensions` |
| `video` | Video clip | `media.url`, `media.duration` |
| `audio` | Audio file | `media.url`, `media.duration` |
| `voice` | Voice note | `media.url`, `media.waveform` |
| `file` | Document/file | `media.file_name`, `media.file_size` |
| `location` | GPS location | `location.*` |
| `contact` | Shared contact | `contact.*` |
| `sticker` | Sticker | `media.url` |
| `system` | System notification | `system.*` |

---

## Indexes

```javascript
// Primary lookups
db.messages.createIndex({ "tenant_id": 1, "message_id": 1 }, { unique: true });

// Conversation messages (most common query)
db.messages.createIndex({ 
  "tenant_id": 1, 
  "conversation_id": 1, 
  "created_at": -1 
});

// User's messages
db.messages.createIndex({ "tenant_id": 1, "sender.user_id": 1, "created_at": -1 });

// Thread queries
db.messages.createIndex({ "tenant_id": 1, "thread.parent_message_id": 1, "created_at": 1 });

// Deduplication
db.messages.createIndex({ 
  "tenant_id": 1, 
  "metadata.client_message_id": 1 
}, { unique: true, sparse: true });

// Disappearing messages cleanup
db.messages.createIndex({ "expires_at": 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { expires_at: { $exists: true } }
});

// Search (if not using separate search service)
db.messages.createIndex({ "tenant_id": 1, "content.text": "text" });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440250"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  message_id: "msg_photo_x9k2m3",
  conversation_id: ObjectId("507f1f77bcf86cd799440100"),
  
  sender: {
    user_id: ObjectId("507f1f77bcf86cd799440001"),
    external_user_id: "user_12345_acme",
    display_name: "John Doe",
    avatar_url: "https://cdn.caas.io/avatars/usr_johndoe.jpg",
    device_id: ObjectId("507f1f77bcf86cd799440010")
  },
  
  content: {
    type: "image",
    
    encrypted_data: "BASE64_ENCRYPTED_CAPTION_AND_METADATA",
    encrypted_keys: [
      {
        user_id: ObjectId("507f1f77bcf86cd799440002"),
        device_id: ObjectId("507f1f77bcf86cd799440020"),
        encrypted_key: "BASE64_ENCRYPTED_KEY_FOR_JANE_DEVICE1"
      }
    ],
    
    text: null,
    
    media: {
      file_id: ObjectId("507f1f77bcf86cd799440300"),
      url: "https://cdn.caas.io/files/encrypted/img_abc123.jpg",
      thumbnail_url: "https://cdn.caas.io/files/encrypted/img_abc123_thumb.jpg",
      mime_type: "image/jpeg",
      file_name: "max_park.jpg",
      file_size: 2450000,
      dimensions: {
        width: 1920,
        height: 1080,
        duration: null
      },
      waveform: null,
      processing_status: "ready"
    },
    
    location: null,
    contact: null,
    link_preview: null,
    
    mentions: [],
    formatting: []
  },
  
  thread: {
    parent_message_id: null,
    root_message_id: null,
    reply_count: 3,
    is_thread_root: true
  },
  
  forwarded: {
    is_forwarded: false,
    original_message_id: null,
    original_sender_name: null,
    original_conversation_id: null,
    forwarded_at: null
  },
  
  reactions_summary: {
    total_count: 5,
    by_emoji: { "❤️": 3, "🐕": 2 },
    user_reacted: [
      ObjectId("507f1f77bcf86cd799440002"),
      ObjectId("507f1f77bcf86cd799440003")
    ]
  },
  
  delivery: {
    status: "read",
    sent_at: ISODate("2024-01-15T18:45:00Z"),
    delivered_to: [
      {
        user_id: ObjectId("507f1f77bcf86cd799440002"),
        device_id: ObjectId("507f1f77bcf86cd799440020"),
        delivered_at: ISODate("2024-01-15T18:45:01Z")
      }
    ],
    read_by: [
      {
        user_id: ObjectId("507f1f77bcf86cd799440002"),
        read_at: ISODate("2024-01-15T18:46:00Z")
      }
    ],
    failed_reason: null
  },
  
  edit: {
    is_edited: false,
    edited_at: null,
    edit_count: 0,
    original_content: null,
    history: []
  },
  
  deletion: {
    is_deleted: false,
    deleted_at: null,
    deleted_by: null,
    delete_type: null,
    deleted_for: null
  },
  
  is_pinned: false,
  pinned_at: null,
  pinned_by: null,
  
  system: null,
  
  metadata: {
    client_message_id: "client_msg_123456789",
    reply_to_story_id: null,
    via_bot: false,
    bot_id: null
  },
  
  created_at: ISODate("2024-01-15T18:45:00Z"),
  updated_at: ISODate("2024-01-15T18:46:00Z"),
  expires_at: null
}
```

---

## Related Schemas

- [Conversations](conversations.md) - Parent conversation
- [Reactions](reactions.md) - Message reactions
- [Read Receipts](read_receipts.md) - Delivery/read status
- [Files](../media/files.md) - Attached files
