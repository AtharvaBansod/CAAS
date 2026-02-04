# Posts Schema

> **Collection**: `posts`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores public content (posts, reels, stories) - the "infinity scroll" content

---

## Overview

Posts represent public or semi-public content similar to social media posts, stories, or reels. This enables SAAS clients to build social features on top of CAAS.

---

## Schema Definition

```javascript
// posts collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === IDENTIFICATION ===
  post_id: String,                    // "post_abc123xyz"
  
  // === AUTHOR ===
  author: {
    user_id: ObjectId,
    external_user_id: String,
    display_name: String,
    avatar_url: String,
    verified: Boolean
  },
  
  // === TYPE ===
  type: String,                       // 'post' | 'story' | 'reel' | 'article'
  
  // === CONTENT ===
  content: {
    // Text content
    text: String,                     // Caption or body text
    
    // Media
    media: [{
      file_id: ObjectId,
      type: String,                   // 'image' | 'video'
      url: String,
      thumbnail_url: String,
      dimensions: {
        width: Number,
        height: Number,
        duration: Number
      },
      order: Number                   // Display order
    }],
    
    // Location tag
    location: {
      name: String,
      latitude: Number,
      longitude: Number
    },
    
    // Tags/Mentions
    mentions: [{
      user_id: ObjectId,
      display_name: String,
      offset: Number,
      length: Number
    }],
    
    hashtags: [String],               // ["pets", "dogsofinstagram"]
    
    // Link
    link: {
      url: String,
      title: String,
      description: String,
      image_url: String
    }
  },
  
  // === VISIBILITY ===
  visibility: String,                 // 'public' | 'followers' | 'close_friends' | 'private'
  
  // === ENGAGEMENT ===
  engagement: {
    likes_count: Number,
    comments_count: Number,
    shares_count: Number,
    saves_count: Number,
    views_count: Number,
    
    // Quick access: has current user engaged
    user_liked: [ObjectId],
    user_saved: [ObjectId]
  },
  
  // === STORY/REEL SPECIFIC ===
  ephemeral: {
    expires_at: Date,                 // Auto-delete for stories
    duration: Number,                 // Display duration seconds
    interactive: {
      type: String,                   // 'poll' | 'quiz' | 'question' | 'slider'
      data: Object                    // Type-specific data
    }
  },
  
  // === MODERATION ===
  moderation: {
    status: String,                   // 'active' | 'hidden' | 'removed'
    flags: [String],
    hidden_reason: String,
    reports_count: Number
  },
  
  // === SETTINGS ===
  settings: {
    comments_enabled: Boolean,
    likes_visible: Boolean,
    share_enabled: Boolean
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date,
  published_at: Date,
  deleted_at: Date
}
```

---

## Indexes

```javascript
db.posts.createIndex({ "tenant_id": 1, "post_id": 1 }, { unique: true });
db.posts.createIndex({ "tenant_id": 1, "author.user_id": 1, "created_at": -1 });
db.posts.createIndex({ "tenant_id": 1, "type": 1, "visibility": 1, "created_at": -1 });
db.posts.createIndex({ "tenant_id": 1, "content.hashtags": 1 });
db.posts.createIndex({ "ephemeral.expires_at": 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { "ephemeral.expires_at": { $exists: true } }
});
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440600"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  post_id: "post_maxreel_x9k2",
  
  author: {
    user_id: ObjectId("507f1f77bcf86cd799440001"),
    external_user_id: "user_12345_acme",
    display_name: "John Doe",
    avatar_url: "https://cdn.caas.io/avatars/usr_johndoe.jpg",
    verified: false
  },
  
  type: "reel",
  
  content: {
    text: "Max loves the park! 🐕 #dogsofpetsocial #happydog",
    media: [{
      file_id: ObjectId("507f1f77bcf86cd799440310"),
      type: "video",
      url: "https://cdn.caas.io/reels/maxreel.mp4",
      thumbnail_url: "https://cdn.caas.io/reels/maxreel_thumb.jpg",
      dimensions: { width: 1080, height: 1920, duration: 15 },
      order: 0
    }],
    location: { name: "Golden Gate Park", latitude: 37.7694, longitude: -122.4862 },
    mentions: [],
    hashtags: ["dogsofpetsocial", "happydog"],
    link: null
  },
  
  visibility: "public",
  
  engagement: {
    likes_count: 156,
    comments_count: 23,
    shares_count: 12,
    saves_count: 8,
    views_count: 2500,
    user_liked: [],
    user_saved: []
  },
  
  ephemeral: null,
  
  moderation: {
    status: "active",
    flags: [],
    hidden_reason: null,
    reports_count: 0
  },
  
  settings: {
    comments_enabled: true,
    likes_visible: true,
    share_enabled: true
  },
  
  created_at: ISODate("2024-01-15T18:00:00Z"),
  updated_at: ISODate("2024-01-15T18:00:00Z"),
  published_at: ISODate("2024-01-15T18:00:00Z"),
  deleted_at: null
}
```

---

## Related Schemas

- [Files](files.md) - Media files
- [Users](../users/users.md) - Author
