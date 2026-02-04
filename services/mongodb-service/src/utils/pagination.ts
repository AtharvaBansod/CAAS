import { PaginatedResult, PaginationOptions } from '../repositories/types';

/**
 * Pagination Helper
 * Provides cursor-based and offset-based pagination utilities
 */
export class PaginationHelper {
  /**
   * Create cursor-based pagination result
   */
  static createCursorPagination<T>(
    items: T[],
    limit: number,
    hasNext: boolean,
    nextCursor?: string,
    prevCursor?: string
  ): PaginatedResult<T> {
    return {
      documents: items,
      pagination: {
        page: 1, // Not applicable for cursor pagination
        limit,
        total: items.length,
        totalPages: 1,
        hasNext,
        hasPrev: !!prevCursor,
      },
    };
  }

  /**
   * Create offset-based pagination result
   */
  static createOffsetPagination<T>(
    items: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      documents: items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Calculate skip value for offset pagination
   */
  static calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Validate pagination options
   */
  static validatePagination(options: PaginationOptions): void {
    if (options.page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    
    if (options.limit < 1 || options.limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
  }

  /**
   * Get default pagination options
   */
  static getDefaultOptions(): PaginationOptions {
    return {
      page: 1,
      limit: 20,
    };
  }

  /**
   * Generate cursor from document
   */
  static generateCursor(document: any, cursorField: string = '_id'): string {
    if (!document || !document[cursorField]) {
      throw new Error(`Cannot generate cursor: missing field ${cursorField}`);
    }
    
    return Buffer.from(JSON.stringify(document[cursorField])).toString('base64');
  }

  /**
   * Parse cursor to value
   */
  static parseCursor(cursor: string): any {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  /**
   * Create MongoDB query for cursor pagination
   */
  static createCursorQuery(cursorField: string, cursorValue: any, direction: 'forward' | 'backward' = 'forward') {
    const operator = direction === 'forward' ? '$gt' : '$lt';
    return {
      [cursorField]: { [operator]: cursorValue },
    };
  }

  /**
   * Get pagination metadata for API responses
   */
  static getPaginationMetadata(pagination: PaginatedResult<any>['pagination']) {
    const { page, limit, total, totalPages, hasNext, hasPrev } = pagination;
    
    return {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages,
      hasNextPage: hasNext,
      hasPreviousPage: hasPrev,
      nextPage: hasNext ? page + 1 : null,
      previousPage: hasPrev ? page - 1 : null,
    };
  }
}
