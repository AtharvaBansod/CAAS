# Media Feature

## Overview
Media handling including upload, processing, and delivery for images, videos, audio, and files.

## Task Files

| File | Tasks | Description |
|------|-------|-------------|
| `01-media-upload.json` | MEDIA-001 to MEDIA-004 | File upload and validation |
| `02-media-processing.json` | MEDIA-005 to MEDIA-008 | Image/video/audio processing |
| `03-media-delivery.json` | MEDIA-009 to MEDIA-012 | CDN, signed URLs, streaming |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Media Pipeline                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Client ──► Gateway ──► Media Service ──► Object Storage       │
│                              │                 │                 │
│                              │                 └──► CDN          │
│                              │                                   │
│                              ├──► Image Processing               │
│                              │    (Sharp, thumbnails)            │
│                              │                                   │
│                              ├──► Video Processing               │
│                              │    (FFmpeg, transcoding)          │
│                              │                                   │
│                              └──► Virus Scanning                 │
│                                   (ClamAV)                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Media Types

### Images
- JPEG, PNG, GIF, WebP, AVIF
- Max size: 10MB
- Thumbnail generation
- EXIF stripping
- Orientation fix

### Videos
- MP4, WebM, MOV
- Max size: 100MB
- Transcoding to H.264/AAC
- Thumbnail extraction
- Duration limit: 5 minutes

### Audio
- MP3, OGG, WAV, M4A
- Max size: 20MB
- Voice message waveform
- Duration limit: 15 minutes

### Files
- PDF, DOC, XLS, etc.
- Max size: 50MB
- Preview generation
- Virus scanning

## Storage Strategy

```typescript
interface MediaStorage {
  // Primary storage
  provider: 'minio' | 's3' | 'gcs' | 'azure';
  bucket: string;
  
  // CDN configuration
  cdn: {
    enabled: boolean;
    domain: string;
    cache_ttl: number;
  };
  
  // Signed URLs
  signed_urls: {
    enabled: boolean;
    expiry: number;
  };
}
```

## Dependencies

- MSG-003: Message Service Layer
- GW-001: Gateway for uploads
- Object Storage: MinIO/S3

## Estimated Effort

- Total Tasks: 12
- Total Hours: ~48 hours
- Priority: High (required for media messages)
