/**
 * Transformation Stage
 * 
 * Processes message content, extracts metadata, and sanitizes input
 */

import { PipelineStage, PipelineContext } from '../types';
export { PipelineStage, PipelineContext };

export interface MessageMetadata {
  mentions?: string[];
  links?: string[];
  hashtags?: string[];
  has_media?: boolean;
  word_count?: number;
}

export class TransformationStage implements PipelineStage {
  name = 'transformation';

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const startTime = Date.now();

    try {
      const message = context.message;

      // Process message content
      if (message.content) {
        // Extract mentions (@username)
        const mentions = this.extractMentions(message.content);

        // Extract links
        const links = this.extractLinks(message.content);

        // Extract hashtags
        const hashtags = this.extractHashtags(message.content);

        // Sanitize HTML if present
        message.content = this.sanitizeHtml(message.content);

        // Calculate word count
        const wordCount = this.countWords(message.content);

        // Add metadata to message
        message.metadata = {
          ...message.metadata,
          mentions,
          links,
          hashtags,
          has_media: !!message.media_urls?.length,
          word_count: wordCount,
        };
      }

      // Record metrics
      context.metrics = context.metrics || {};
      context.metrics[this.name] = {
        duration_ms: Date.now() - startTime,
        success: true,
      };

      return context;
    } catch (error) {
      context.metrics = context.metrics || {};
      context.metrics[this.name] = {
        duration_ms: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      throw error;
    }
  }

  /**
   * Extract mentions from message content
   */
  private extractMentions(content: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Extract links from message content
   */
  private extractLinks(content: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const links: string[] = [];
    let match;

    while ((match = urlRegex.exec(content)) !== null) {
      links.push(match[1]);
    }

    return links;
  }

  /**
   * Extract hashtags from message content
   */
  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;

    while ((match = hashtagRegex.exec(content)) !== null) {
      hashtags.push(match[1]);
    }

    return hashtags;
  }

  /**
   * Sanitize HTML content
   */
  private sanitizeHtml(content: string): string {
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.trim().split(/\s+/).length;
  }
}
