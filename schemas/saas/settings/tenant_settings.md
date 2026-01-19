# Tenant Settings Schema

> **Collection**: `tenant_settings`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores tenant-specific configuration and customization

---

## Overview

Tenant settings allow SAAS clients to customize CAAS behavior for their application.

---

## Schema Definition

```javascript
// tenant_settings collection
{
  _id: ObjectId,
  tenant_id: String,                  // Unique per tenant
  
  // === GENERAL ===
  general: {
    default_language: String,         // 'en' | 'es' | ...
    default_timezone: String,         // 'UTC' | 'America/Los_Angeles'
    date_format: String,              // 'MM/DD/YYYY' | 'DD/MM/YYYY'
    time_format: String               // '12h' | '24h'
  },
  
  // === CHAT SETTINGS ===
  chat: {
    max_message_length: Number,       // Default 4000
    max_file_size_mb: Number,         // Default 25
    allowed_file_types: [String],     // ['image/*', 'video/*', 'application/pdf']
    
    message_retention_days: Number,   // 0 = forever
    auto_delete_enabled: Boolean,
    
    // Group limits
    max_group_members: Number,        // Default 1000
    max_groups_per_user: Number,      // Default 100
    
    // Features
    voice_messages_enabled: Boolean,
    video_messages_enabled: Boolean,
    location_sharing_enabled: Boolean,
    reactions_enabled: Boolean,
    read_receipts_default: Boolean,
    typing_indicators_default: Boolean
  },
  
  // === CALLS ===
  calls: {
    voice_calls_enabled: Boolean,
    video_calls_enabled: Boolean,
    screen_sharing_enabled: Boolean,
    max_call_participants: Number,    // Default 50
    max_call_duration_minutes: Number,
    recording_enabled: Boolean,
    recording_storage_days: Number
  },
  
  // === MODERATION ===
  moderation: {
    profanity_filter_enabled: Boolean,
    custom_blocked_words: [String],
    spam_detection_enabled: Boolean,
    link_preview_enabled: Boolean,
    media_scanning_enabled: Boolean,
    
    auto_ban_threshold: Number,       // Warnings before auto-ban
    report_threshold: Number          // Reports before auto-hide
  },
  
  // === BRANDING ===
  branding: {
    primary_color: String,            // "#6366f1"
    secondary_color: String,
    logo_url: String,
    favicon_url: String,
    custom_css: String,
    powered_by_visible: Boolean       // Show "Powered by CAAS"
  },
  
  // === NOTIFICATIONS ===
  notifications: {
    push_enabled: Boolean,
    email_enabled: Boolean,
    email_templates: {
      welcome: String,
      password_reset: String,
      invite: String
    },
    
    // Defaults for new users
    default_push_enabled: Boolean,
    default_email_enabled: Boolean,
    default_sound_enabled: Boolean
  },
  
  // === INTEGRATIONS ===
  integrations: {
    webhooks_enabled: Boolean,
    webhook_url: String,
    webhook_events: [String],
    webhook_secret: String,
    
    analytics: {
      google_analytics_id: String,
      mixpanel_token: String
    }
  },
  
  // === SECURITY ===
  security: {
    e2e_encryption_required: Boolean,
    session_timeout_minutes: Number,
    max_devices_per_user: Number,
    
    password_policy: {
      min_length: Number,
      require_uppercase: Boolean,
      require_lowercase: Boolean,
      require_numbers: Boolean,
      require_symbols: Boolean
    }
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
db.tenant_settings.createIndex({ "tenant_id": 1 }, { unique: true });
```

---

## Sample Document

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799440800"),
  tenant_id: "clnt_acme_2024_x7k9",
  
  general: {
    default_language: "en",
    default_timezone: "America/Los_Angeles",
    date_format: "MM/DD/YYYY",
    time_format: "12h"
  },
  
  chat: {
    max_message_length: 4000,
    max_file_size_mb: 50,
    allowed_file_types: ["image/*", "video/*", "application/pdf"],
    message_retention_days: 0,
    auto_delete_enabled: false,
    max_group_members: 500,
    max_groups_per_user: 50,
    voice_messages_enabled: true,
    video_messages_enabled: true,
    location_sharing_enabled: true,
    reactions_enabled: true,
    read_receipts_default: true,
    typing_indicators_default: true
  },
  
  calls: {
    voice_calls_enabled: true,
    video_calls_enabled: true,
    screen_sharing_enabled: true,
    max_call_participants: 25,
    max_call_duration_minutes: 120,
    recording_enabled: false,
    recording_storage_days: 30
  },
  
  moderation: {
    profanity_filter_enabled: true,
    custom_blocked_words: ["spam", "scam"],
    spam_detection_enabled: true,
    link_preview_enabled: true,
    media_scanning_enabled: true,
    auto_ban_threshold: 3,
    report_threshold: 5
  },
  
  branding: {
    primary_color: "#FF6B35",
    secondary_color: "#1A1A1A",
    logo_url: "https://cdn.petsocial.com/logo.png",
    favicon_url: "https://cdn.petsocial.com/favicon.ico",
    custom_css: null,
    powered_by_visible: false
  },
  
  notifications: {
    push_enabled: true,
    email_enabled: true,
    email_templates: {
      welcome: "custom_welcome_template",
      password_reset: null,
      invite: null
    },
    default_push_enabled: true,
    default_email_enabled: false,
    default_sound_enabled: true
  },
  
  integrations: {
    webhooks_enabled: true,
    webhook_url: "https://api.petsocial.com/webhooks/caas",
    webhook_events: ["message.sent", "user.joined", "file.uploaded"],
    webhook_secret: "encrypted_secret",
    analytics: {
      google_analytics_id: "G-XXXXXXXXXX",
      mixpanel_token: null
    }
  },
  
  security: {
    e2e_encryption_required: true,
    session_timeout_minutes: 1440,
    max_devices_per_user: 5,
    password_policy: {
      min_length: 8,
      require_uppercase: true,
      require_lowercase: true,
      require_numbers: true,
      require_symbols: false
    }
  },
  
  created_at: ISODate("2024-01-01T00:00:00Z"),
  updated_at: ISODate("2024-01-15T00:00:00Z")
}
```

---

## Related Schemas

- [SAAS Clients](../../platform/saas_clients.md) - Parent client
