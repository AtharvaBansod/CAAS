export const storageConfig = {
  endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
  bucket: process.env.S3_BUCKET || 'caas-media',
  region: process.env.S3_REGION || 'us-east-1',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  cdnDomain: process.env.CDN_DOMAIN,
  signedUrlExpiry: parseInt(process.env.SIGNED_URL_EXPIRY || '3600'),
  forcePathStyle: true, // Required for MinIO
};

export const mediaConfig = {
  maxSizes: {
    image: 10 * 1024 * 1024, // 10MB
    video: 100 * 1024 * 1024, // 100MB
    audio: 20 * 1024 * 1024, // 20MB
    file: 50 * 1024 * 1024, // 50MB
  },
  allowedTypes: {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4'],
    file: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  thumbnailSize: { width: 200, height: 200 },
  previewSize: { width: 800, height: 800 },
  waveformSamples: 100,
};
