// Text message processor for markdown, mentions, and link previews
import { ProcessedText, Mention, LinkPreview } from '../message.types';
import { LinkPreviewService } from './link-preview.service';

export class TextProcessor {
  private linkPreviewService: LinkPreviewService;

  constructor(linkPreviewService: LinkPreviewService) {
    this.linkPreviewService = linkPreviewService;
  }

  async process(text: string, maxLength: number = 4000): Promise<ProcessedText> {
    if (text.length > maxLength) {
      throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
    }

    return {
      original: text,
      formatted: this.formatMarkdown(text),
      mentions: this.extractMentions(text),
      links: await this.extractLinks(text),
      hashtags: this.extractHashtags(text),
    };
  }

  private formatMarkdown(text: string): string {
    let formatted = text;

    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');

    // Code: `code`
    formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');

    // Code block: ```code```
    formatted = formatted.replace(/```(.+?)```/gs, '<pre><code>$1</code></pre>');

    // Strikethrough: ~~text~~
    formatted = formatted.replace(/~~(.+?)~~/g, '<del>$1</del>');

    return formatted;
  }

  private extractMentions(text: string): Mention[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: Mention[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push({
        user_id: match[1], // In real implementation, would resolve username to user_id
        username: match[1],
        start: match.index,
        length: match[0].length,
      });
    }

    // Limit to 50 mentions
    return mentions.slice(0, 50);
  }

  private async extractLinks(text: string): Promise<LinkPreview[]> {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls: string[] = [];
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      urls.push(match[1]);
    }

    // Limit to 10 links
    const limitedUrls = urls.slice(0, 10);

    // Fetch previews for first 3 links
    const previewUrls = limitedUrls.slice(0, 3);
    const previews: LinkPreview[] = [];

    for (const url of previewUrls) {
      try {
        const preview = await this.linkPreviewService.getPreview(url);
        if (preview) {
          previews.push(preview);
        }
      } catch (error) {
        console.error(`Failed to fetch preview for ${url}:`, error);
      }
    }

    return previews;
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const hashtags: string[] = [];
    let match;

    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push(match[1]);
    }

    return hashtags;
  }
}
