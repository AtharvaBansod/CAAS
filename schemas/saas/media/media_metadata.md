# Media Metadata Schema

> **Collection**: `media_metadata`  
> **Database**: Tenant-scoped  
> **Purpose**: Stores additional processing metadata and CDN cache info for media files

---

## Overview

Supplementary collection for media processing jobs, CDN purge tracking, and analytics.

---

## Schema Definition

```javascript
// media_metadata collection
{
  _id: ObjectId,
  tenant_id: String,
  
  // === REFERENCE ===
  file_id: ObjectId,                  // Reference to files._id
  
  // === PROCESSING JOBS ===
  jobs: [{
    job_id: String,
    job_type: String,                 // 'transcode' | 'thumbnail' | 'optimize' | 'scan'
    status: String,                   // 'queued' | 'processing' | 'completed' | 'failed'
    priority: Number,
    
    input: Object,                    // Job-specific input params
    output: Object,                   // Job results
    
    worker: String,                   // Which worker processed
    queued_at: Date,
    started_at: Date,
    completed_at: Date,
    error: String,
    retry_count: Number
  }],
  
  // === CDN ===
  cdn: {
    cached: Boolean,
    cache_key: String,
    cached_at: Date,
    cache_hits: Number,
    last_purged_at: Date,
    edge_locations: [String]          // CDN edge locations serving this
  },
  
  // === ANALYTICS ===
  analytics: {
    total_views: Number,
    total_downloads: Number,
    bandwidth_used: Number,           // Bytes
    unique_viewers: Number,
    views_by_country: Object,         // { "US": 100, "GB": 50 }
    views_by_device: Object           // { "mobile": 80, "desktop": 70 }
  },
  
  // === TIMESTAMPS ===
  created_at: Date,
  updated_at: Date
}
```

---

## Indexes

```javascript
db.media_metadata.createIndex({ "tenant_id": 1, "file_id": 1 }, { unique: true });
db.media_metadata.createIndex({ "jobs.job_id": 1 });
db.media_metadata.createIndex({ "jobs.status": 1 });
```

---

## Related Schemas

- [Files](files.md) - Parent file
