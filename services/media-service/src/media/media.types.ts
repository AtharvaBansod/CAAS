export interface Media {
  id: string;
  tenant_id: string;
  user_id: string;
  key: string; // S3 key
  filename: string;
  mime_type: string;
  size: number;
  type: 'image' | 'video' | 'audio' | 'file';
  
  // Processing results
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
  thumbnail_key?: string;
  preview_key?: string;
  processed_key?: string;
  
  // Media-specific metadata
  dimensions?: { width: number; height: number };
  duration?: number;
  waveform?: number[];
  page_count?: number;
  
  // URLs (generated on request)
  url?: string;
  thumbnail_url?: string;
  preview_url?: string;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
  attached_to?: string; // Message ID if attached
}

export interface UploadResult {
  id: string;
  key: string;
  filename: string;
  mime_type: string;
  size: number;
  type: string;
  status: string;
  created_at: Date;
}

export interface ProcessingResult {
  thumbnail_key?: string;
  preview_key?: string;
  processed_key?: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  waveform?: number[];
  page_count?: number;
}

export interface SignedUrlOptions {
  expiresIn?: number;
  contentType?: string;
  download?: boolean;
  filename?: string;
}

export interface MediaUrls {
  url: string;
  thumbnail_url?: string;
  preview_url?: string;
}

export interface QuotaCheck {
  used: number;
  limit: number;
  remaining: number;
}
