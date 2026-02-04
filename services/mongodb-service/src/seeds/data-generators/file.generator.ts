import { getConnectionManager } from '../../connections';
import { v4 as uuidv4 } from 'uuid';

/**
 * File Data Generator
 * Generates file metadata for a tenant
 */
export class FileGenerator {
  private connection = getConnectionManager();

  /**
   * Generate files for a tenant
   */
  async generate(tenantId: string, count: number, users: any[]) {
    const db = this.connection.getConnection();
    const filesCollection = db.collection('files');
    
    const files = [];
    
    for (let i = 0; i < count; i++) {
      const uploader = users[Math.floor(Math.random() * users.length)];
      const file = this.generateFile(tenantId, uploader);
      files.push(file);
    }

    // Insert files in batches
    if (files.length > 0) {
      await filesCollection.insertMany(files);
    }

    return files;
  }

  /**
   * Generate a single file
   */
  private generateFile(tenantId: string, uploader: any) {
    const fileType = this.getRandomFileType();
    const fileData = this.generateFileData(fileType);
    
    return {
      _id: uuidv4(),
      tenantId,
      uploaderId: uploader._id,
      name: fileData.name,
      type: fileData.type,
      size: fileData.size,
      mimeType: fileData.mimeType,
      url: fileData.url,
      thumbnailUrl: fileData.thumbnailUrl,
      metadata: {
        originalName: fileData.name,
        encoding: 'utf-8',
        checksum: this.generateChecksum(),
        dimensions: fileData.dimensions,
        duration: fileData.duration,
        pages: fileData.pages,
      },
      sharing: {
        isPublic: Math.random() > 0.7, // 30% public
        shareToken: Math.random() > 0.7 ? this.generateShareToken() : null,
        expiresAt: Math.random() > 0.8 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
        permissions: this.generatePermissions(),
      },
      processing: {
        status: 'completed',
        thumbnailGenerated: !!fileData.thumbnailUrl,
        virusScanned: true,
        virusScanResult: 'clean',
        extractedText: Math.random() > 0.5 ? this.generateExtractedText() : null,
      },
      stats: {
        downloadCount: Math.floor(Math.random() * 100),
        viewCount: Math.floor(Math.random() * 500),
        lastAccessedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      },
      tags: this.generateTags(),
      description: Math.random() > 0.6 ? this.generateDescription() : null,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Get random file type
   */
  private getRandomFileType(): string {
    const types = ['image', 'document', 'video', 'audio', 'archive', 'other'];
    const weights = [0.3, 0.25, 0.15, 0.1, 0.1, 0.1];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return types[i];
      }
    }
    
    return 'image';
  }

  /**
   * Generate file data based on type
   */
  private generateFileData(type: string) {
    switch (type) {
      case 'image':
        return this.generateImageData();
      case 'document':
        return this.generateDocumentData();
      case 'video':
        return this.generateVideoData();
      case 'audio':
        return this.generateAudioData();
      case 'archive':
        return this.generateArchiveData();
      default:
        return this.generateOtherData();
    }
  }

  /**
   * Generate image file data
   */
  private generateImageData() {
    const widths = [800, 1024, 1280, 1920, 2560];
    const heights = [600, 768, 720, 1080, 1440];
    const formats = ['jpg', 'png', 'gif', 'webp'];
    
    const width = widths[Math.floor(Math.random() * widths.length)];
    const height = heights[Math.floor(Math.random() * heights.length)];
    const format = formats[Math.floor(Math.random() * formats.length)];
    
    return {
      name: `image_${Date.now()}_${Math.random().toString(36).substring(7)}.${format}`,
      type: 'image',
      mimeType: `image/${format}`,
      size: Math.floor(width * height * 0.5), // Rough estimate
      url: `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/${width}/${height}.${format}`,
      thumbnailUrl: `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/200/150.${format}`,
      dimensions: { width, height },
    };
  }

  /**
   * Generate document file data
   */
  private generateDocumentData() {
    const documents = [
      { name: 'report.pdf', type: 'application/pdf', size: 1048576 },
      { name: 'presentation.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 5242880 },
      { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 2097152 },
      { name: 'document.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 524288 },
      { name: 'notes.txt', type: 'text/plain', size: 10240 },
    ];
    
    const doc = documents[Math.floor(Math.random() * documents.length)];
    
    return {
      ...doc,
      name: `${doc.name.split('.')[0]}_${Date.now()}.${doc.name.split('.')[1]}`,
      url: `https://example.com/files/documents/${Math.random().toString(36).substring(7)}/${doc.name}`,
      thumbnailUrl: doc.type.includes('pdf') ? `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/200/300.jpg` : null,
      pages: Math.random() > 0.5 ? Math.floor(Math.random() * 50) + 1 : null,
    };
  }

  /**
   * Generate video file data
   */
  private generateVideoData() {
    const resolutions = [
      { width: 640, height: 480, label: '480p' },
      { width: 1280, height: 720, label: '720p' },
      { width: 1920, height: 1080, label: '1080p' },
    ];
    
    const resolution = resolutions[Math.floor(Math.random() * resolutions.length)];
    const duration = Math.floor(Math.random() * 3600) + 30; // 30 seconds to 1 hour
    
    return {
      name: `video_${Date.now()}.mp4`,
      type: 'video',
      mimeType: 'video/mp4',
      size: Math.floor(duration * 1000000), // Rough estimate: 1MB per second
      url: `https://example.com/files/videos/${Math.random().toString(36).substring(7)}.mp4`,
      thumbnailUrl: `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/${resolution.width}/${resolution.height}.jpg`,
      dimensions: { width: resolution.width, height: resolution.height },
      duration,
    };
  }

  /**
   * Generate audio file data
   */
  private generateAudioData() {
    const formats = ['mp3', 'wav', 'ogg', 'm4a'];
    const format = formats[Math.floor(Math.random() * formats.length)];
    const duration = Math.floor(Math.random() * 3600) + 30; // 30 seconds to 1 hour
    
    return {
      name: `audio_${Date.now()}.${format}`,
      type: 'audio',
      mimeType: `audio/${format}`,
      size: Math.floor(duration * 100000), // Rough estimate: 100KB per second
      url: `https://example.com/files/audio/${Math.random().toString(36).substring(7)}.${format}`,
      thumbnailUrl: null,
      duration,
    };
  }

  /**
   * Generate archive file data
   */
  private generateArchiveData() {
    const archives = [
      { name: 'archive.zip', type: 'application/zip', size: 10485760 },
      { name: 'backup.tar.gz', type: 'application/gzip', size: 52428800 },
      { name: 'data.rar', type: 'application/x-rar-compressed', size: 20971520 },
    ];
    
    const archive = archives[Math.floor(Math.random() * archives.length)];
    
    return {
      ...archive,
      name: `${archive.name.split('.')[0]}_${Date.now()}.${archive.name.split('.')[1]}`,
      url: `https://example.com/files/archives/${Math.random().toString(36).substring(7)}/${archive.name}`,
      thumbnailUrl: null,
    };
  }

  /**
   * Generate other file data
   */
  private generateOtherData() {
    const files = [
      { name: 'data.json', type: 'application/json', size: 10240 },
      { name: 'config.xml', type: 'application/xml', size: 5120 },
      { name: 'script.js', type: 'application/javascript', size: 15360 },
      { name: 'style.css', type: 'text/css', size: 8192 },
    ];
    
    const file = files[Math.floor(Math.random() * files.length)];
    
    return {
      ...file,
      name: `${file.name.split('.')[0]}_${Date.now()}.${file.name.split('.')[1]}`,
      url: `https://example.com/files/other/${Math.random().toString(36).substring(7)}/${file.name}`,
      thumbnailUrl: null,
    };
  }

  /**
   * Generate checksum
   */
  private generateChecksum(): string {
    return Math.random().toString(36).substring(2, 34);
  }

  /**
   * Generate share token
   */
  private generateShareToken(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate permissions
   */
  private generatePermissions(): any {
    return {
      canView: true,
      canDownload: true,
      canShare: Math.random() > 0.3,
      canEdit: Math.random() > 0.7,
      canDelete: Math.random() > 0.9,
    };
  }

  /**
   * Generate tags
   */
  private generateTags(): string[] {
    const allTags = [
      'important', 'work', 'personal', 'project', 'meeting',
      'urgent', 'review', 'draft', 'final', 'archive',
      'shared', 'private', 'media', 'document', 'backup',
    ];
    
    const tagCount = Math.floor(Math.random() * 5); // 0-4 tags
    const tags = [];
    
    for (let i = 0; i < tagCount; i++) {
      const tag = allTags[Math.floor(Math.random() * allTags.length)];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  /**
   * Generate description
   */
  private generateDescription(): string {
    const descriptions = [
      'Important document for review',
      'Meeting notes and action items',
      'Project specifications and requirements',
      'Design mockups and prototypes',
      'Financial reports and analysis',
      'User research and feedback',
      'Technical documentation',
      'Marketing materials',
      'Legal documents and contracts',
      'Training materials and guides',
    ];
    
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Generate extracted text
   */
  private generateExtractedText(): string {
    const texts = [
      'This document contains important information about the project.',
      'Meeting held on Monday to discuss the quarterly results.',
      'The following action items were identified during the review.',
      'Please review and provide feedback by end of week.',
      'This file contains confidential information and should be handled accordingly.',
      'Analysis shows positive trends in user engagement.',
      'Recommendations for improvement are outlined in section 3.',
      'Data was collected over a period of three months.',
      'Results indicate a 25% increase in performance.',
      'Further investigation is required to validate these findings.',
    ];
    
    return texts[Math.floor(Math.random() * texts.length)];
  }
}
