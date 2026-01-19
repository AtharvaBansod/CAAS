# Files Schema

> **Collection**: `files`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores metadata for all uploaded files (images, videos, documents)

---

## Overview

The files collection stores metadata only - actual files are stored in object storage (S3/GCS/Azure Blob). Supports:
- Encrypted file storage
- CDN delivery
- Thumbnails and transcoding
- Access control

---

## Schema Definition

```javascript
// files collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === IDENTIFICATION ===
  file_id: String,                    // "file_abc123xyz"
  
  // === OWNERSHIP ===
  uploader_id: ObjectId,              // User who uploaded
  
  // === STORAGE ===
  storage: {
    provider: String,                 // 's3' | 'gcs' | 'azure' | 'local'
    bucket: String,                   // "caas-files-prod"
    region: String,                   // "us-west-2"
    key: String,                      // "tenant/user/2024/01/abc123.enc"
    
    // URLs
    original_url: String,             // Direct storage URL (internal)
    cdn_url: String,                  // CDN URL (public/signed)
    
    // Encryption
    encrypted: Boolean,
    encryption_key_id: String,        // Reference to encryption key
    encryption_algorithm: String      // 'AES-256-GCM'
  },
  
  // === FILE INFO ===
  metadata: {
    original_name: String,            // "vacation_photo.jpg"
    mime_type: String,                // "image/jpeg"
    extension: String,                // "jpg"
    size: Number,                     // Bytes
    checksum: String,                 // SHA-256 hash
    
    // Media dimensions
    dimensions: {
      width: Number,
      height: Number,
      duration: Number,               // Seconds (video/audio)
      aspect_ratio: String            // "16:9"
    },
    
    // EXIF data (images)
    exif: {
      camera: String,
      taken_at: Date,
      gps: {
        latitude: Number,
        longitude: Number
      }
    },
    
    // Video/Audio metadata
    media_info: {
      codec: String,
      bitrate: Number,
      framerate: Number,
      audio_channels: Number,
      sample_rate: Number
    }
  },
  
  // === PROCESSING ===
  processing: {
    status: String,                   // 'pending' | 'processing' | 'completed' | 'failed'
    started_at: Date,
    completed_at: Date,
    error: String,
    
    // Generated variants
    variants: [{
      type: String,                   // 'thumbnail' | 'preview' | 'transcoded'
      key: String,                    // Storage key
      cdn_url: String,
      width: Number,
      height: Number,
      size: Number,
      mime_type: String,
      quality: String                 // 'low' | 'medium' | 'high'
    }],
    
    // Thumbnails shortcut
    thumbnail: {
      url: String,
      width: Number,
      height: Number
    }
  },
  
  // === USAGE ===
  usage: {
    context: String,                  // 'message' | 'avatar' | 'group_icon' | 'post' | 'story'
    message_id: ObjectId,             // If attached to message
    conversation_id: ObjectId,        // If in conversation
    post_id: ObjectId                 // If attached to post
  },
  
  // === SHARING ===
  sharing: {
    visibility: String,               // 'private' | 'conversation' | 'public'
    shared_with: [ObjectId],          // User IDs with access
    public_url: String,               // Public share URL (if public)
    public_expires_at: Date,
    download_count: Number,
    view_count: Number
  },
  
  // === MODERATION ===
  moderation: {
    scanned: Boolean,
    scan_result: String,              // 'safe' | 'flagged' | 'blocked'
    flags: [String],                  // ['nsfw', 'violence', 'malware']
    reviewed_by: ObjectId,
    reviewed_at: Date
  },
  
  // === LIFECYCLE ===
  lifecycle: {
    expires_at: Date,                 // Auto-delete after this date
    retained_until: Date,             // Legal hold
    archived: Boolean,
    archived_at: Date,
    archive_tier: String              // 'standard' | 'glacier'
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  deleted_at: Date
}
```

---

## Indexes

```javascript
db.files.createIndex({ "tenant_id": 1, "file_id": 1 }, { unique: true });
db.files.createIndex({ "tenant_id": 1, "uploader_id": 1, "created_at": -1 });
db.files.createIndex({ "tenant_id": 1, "usage.message_id": 1 });
db.files.createIndex({ "tenant_id": 1, "usage.conversation_id": 1 });
db.files.createIndex({ "storage.checksum": 1 });  // Deduplication
db.files.createIndex({ "lifecycle.expires_at": 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { "lifecycle.expires_at": { $exists: true } }
});
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440300"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  file_id: "file_maxpark_m9k2",
  uploader_id: ObjectId("507f1f77bcf86cd799440001"),
  
  storage: {
    provider: "s3",
    bucket: "caas-files-prod",
    region: "us-west-2",
    key: "clnt_acme/usr_johndoe/2024/01/maxpark_enc.jpg",
    original_url: "s3://caas-files-prod/clnt_acme/usr_johndoe/2024/01/maxpark_enc.jpg",
    cdn_url: "https://cdn.caas.io/files/maxpark_x9k2.jpg",
    encrypted: true,
    encryption_key_id: "fk_msg_abc123",
    encryption_algorithm: "AES-256-GCM"
  },
  
  metadata: {
    original_name: "max_at_park.jpg",
    mime_type: "image/jpeg",
    extension: "jpg",
    size: 2450000,
    checksum: "sha256:abc123def456...",
    dimensions: {
      width: 1920,
      height: 1080,
      duration: null,
      aspect_ratio: "16:9"
    },
    exif: {
      camera: "iPhone 15 Pro",
      taken_at: ISODate("2024-01-15T17:30:00Z"),
      gps: { latitude: 37.7749, longitude: -122.4194 }
    },
    media_info: null
  },
  
  processing: {
    status: "completed",
    started_at: ISODate("2024-01-15T18:44:55Z"),
    completed_at: ISODate("2024-01-15T18:44:58Z"),
    error: null,
    variants: [
      {
        type: "thumbnail",
        key: "clnt_acme/usr_johndoe/2024/01/maxpark_thumb.jpg",
        cdn_url: "https://cdn.caas.io/files/maxpark_x9k2_thumb.jpg",
        width: 200,
        height: 112,
        size: 15000,
        mime_type: "image/jpeg",
        quality: "medium"
      }
    ],
    thumbnail: {
      url: "https://cdn.caas.io/files/maxpark_x9k2_thumb.jpg",
      width: 200,
      height: 112
    }
  },
  
  usage: {
    context: "message",
    message_id: ObjectId("507f1f77bcf86cd799440250"),
    conversation_id: ObjectId("507f1f77bcf86cd799440100"),
    post_id: null
  },
  
  sharing: {
    visibility: "conversation",
    shared_with: [],
    public_url: null,
    public_expires_at: null,
    download_count: 5,
    view_count: 45
  },
  
  moderation: {
    scanned: true,
    scan_result: "safe",
    flags: [],
    reviewed_by: null,
    reviewed_at: null
  },
  
  lifecycle: {
    expires_at: null,
    retained_until: null,
    archived: false,
    archived_at: null,
    archive_tier: null
  },
  
  created_at: ISODate("2024-01-15T18:44:55Z"),
  updated_at: ISODate("2024-01-15T18:44:58Z"),
  deleted_at: null
}
```

---

## Related Schemas

- [Messages](../messaging/messages.md) - Message attachments
- [Posts](posts.md) - Post media
