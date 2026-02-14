// Link preview service for fetching and caching URL metadata
import { LinkPreview } from '../message.types';
import Redis from 'ioredis';
import axios from 'axios';
import * as cheerio from 'cheerio';

export class LinkPreviewService {
  private redis: Redis;
  private cacheTTL: number = 86400; // 24 hours

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async getPreview(url: string): Promise<LinkPreview | null> {
    // Check cache first
    const cached = await this.redis.get(`link_preview:${url}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch preview
    const preview = await this.fetchPreview(url);
    if (preview) {
      // Cache the result
      await this.redis.setex(
        `link_preview:${url}`,
        this.cacheTTL,
        JSON.stringify(preview)
      );
    }

    return preview;
  }

  private async fetchPreview(url: string): Promise<LinkPreview | null> {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'CAAS-Bot/1.0',
        },
        maxRedirects: 5,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract Open Graph tags
      const ogTitle = $('meta[property="og:title"]').attr('content');
      const ogDescription = $('meta[property="og:description"]').attr('content');
      const ogImage = $('meta[property="og:image"]').attr('content');
      const ogSiteName = $('meta[property="og:site_name"]').attr('content');

      // Fallback to standard meta tags
      const title = ogTitle || $('title').text() || undefined;
      const description = ogDescription || $('meta[name="description"]').attr('content') || undefined;
      const image = ogImage || undefined;
      const siteName = ogSiteName || undefined;

      return {
        url,
        title,
        description,
        image_url: image,
        site_name: siteName,
      };
    } catch (error) {
      console.error(`Failed to fetch preview for ${url}:`, error);
      return null;
    }
  }
}
