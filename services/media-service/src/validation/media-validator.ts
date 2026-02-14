import { mediaConfig } from '../config/storage.config';
import { fileTypeFromBuffer } from 'file-type';

export class MediaValidator {
  async validate(file: { filename: string; mimetype: string; file: Buffer }): Promise<void> {
    // 1. Check file size
    const maxSize = this.getMaxSize(file.mimetype);
    if (file.file.length > maxSize) {
      throw new Error(`File exceeds maximum size of ${maxSize} bytes`);
    }

    // 2. Validate MIME type
    if (!this.isAllowedType(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }

    // 3. Verify actual file type (magic bytes)
    const actualType = await this.detectFileType(file.file);
    if (actualType && actualType !== file.mimetype) {
      throw new Error(`File type mismatch: claimed ${file.mimetype}, actual ${actualType}`);
    }
  }

  private getMaxSize(mimetype: string): number {
    if (mimetype.startsWith('image/')) return mediaConfig.maxSizes.image;
    if (mimetype.startsWith('video/')) return mediaConfig.maxSizes.video;
    if (mimetype.startsWith('audio/')) return mediaConfig.maxSizes.audio;
    return mediaConfig.maxSizes.file;
  }

  private isAllowedType(mimetype: string): boolean {
    const allAllowed = [
      ...mediaConfig.allowedTypes.image,
      ...mediaConfig.allowedTypes.video,
      ...mediaConfig.allowedTypes.audio,
      ...mediaConfig.allowedTypes.file,
    ];
    return allAllowed.includes(mimetype);
  }

  private async detectFileType(buffer: Buffer): Promise<string | null> {
    try {
      const result = await fileTypeFromBuffer(buffer);
      return result?.mime || null;
    } catch {
      return null;
    }
  }

  getMediaType(mimetype: string): 'image' | 'video' | 'audio' | 'file' {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'file';
  }
}
