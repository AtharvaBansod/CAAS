import { FilterQuery } from 'mongoose';
import { QueryFilter } from '../repositories/types';

/**
 * Tenant-Aware Query Builder
 * Helps build MongoDB queries with automatic tenant isolation
 */
export class QueryBuilder<T> {
  private query: FilterQuery<T> = {};
  private tenantId?: string;

  /**
   * Add where conditions to query
   */
  where(conditions: QueryFilter<T>): this {
    this.query = { ...this.query, ...conditions };
    return this;
  }

  /**
   * Set tenant ID for isolation
   */
  tenant(tenantId: string): this {
    this.tenantId = tenantId;
    return this;
  }

  /**
   * Add AND conditions
   */
  and(conditions: QueryFilter<T>[]): this {
    if (!this.query.$and) {
      this.query.$and = [];
    }
    this.query.$and.push(...conditions);
    return this;
  }

  /**
   * Add OR conditions
   */
  or(conditions: QueryFilter<T>[]): this {
    if (!this.query.$or) {
      this.query.$or = [];
    }
    this.query.$or.push(...conditions);
    return this;
  }

  /**
   * Add NOT conditions
   */
  not(conditions: QueryFilter<T>): this {
    this.query.$not = conditions;
    return this;
  }

  /**
   * Add field equality
   */
  equals<K extends keyof T>(field: K, value: T[K]): this {
    this.query[field as string] = value;
    return this;
  }

  /**
   * Add field with $in operator
   */
  in<K extends keyof T>(field: K, values: T[K][]): this {
    this.query[field as string] = { $in: values };
    return this;
  }

  /**
   * Add field with $nin operator
   */
  notIn<K extends keyof T>(field: K, values: T[K][]): this {
    this.query[field as string] = { $nin: values };
    return this;
  }

  /**
   * Add field with $gt operator
   */
  greaterThan<K extends keyof T>(field: K, value: T[K]): this {
    this.query[field as string] = { $gt: value };
    return this;
  }

  /**
   * Add field with $gte operator
   */
  greaterThanOrEqual<K extends keyof T>(field: K, value: T[K]): this {
    this.query[field as string] = { $gte: value };
    return this;
  }

  /**
   * Add field with $lt operator
   */
  lessThan<K extends keyof T>(field: K, value: T[K]): this {
    this.query[field as string] = { $lt: value };
    return this;
  }

  /**
   * Add field with $lte operator
   */
  lessThanOrEqual<K extends keyof T>(field: K, value: T[K]): this {
    this.query[field as string] = { $lte: value };
    return this;
  }

  /**
   * Add field with $ne operator
   */
  notEqual<K extends keyof T>(field: K, value: T[K]): this {
    this.query[field as string] = { $ne: value };
    return this;
  }

  /**
   * Add field with $regex operator
   */
  regex<K extends keyof T>(field: K, pattern: RegExp | string): this {
    this.query[field as string] = { $regex: pattern };
    return this;
  }

  /**
   * Add field exists check
   */
  exists<K extends keyof T>(field: K, exists: boolean = true): this {
    this.query[field as string] = { $exists: exists };
    return this;
  }

  /**
   * Add text search
   */
  text(searchText: string): this {
    this.query.$text = { $search: searchText };
    return this;
  }

  /**
   * Add date range
   */
  dateRange<K extends keyof T>(field: K, startDate?: Date, endDate?: Date): this {
    const dateQuery: any = {};
    
    if (startDate) {
      dateQuery.$gte = startDate;
    }
    
    if (endDate) {
      dateQuery.$lte = endDate;
    }
    
    if (Object.keys(dateQuery).length > 0) {
      this.query[field as string] = dateQuery;
    }
    
    return this;
  }

  /**
   * Add null check
   */
  isNull<K extends keyof T>(field: K): this {
    this.query[field as string] = null;
    return this;
  }

  /**
   * Add not null check
   */
  isNotNull<K extends keyof T>(field: K): this {
    this.query[field as string] = { $ne: null };
    return this;
  }

  /**
   * Add array size check
   */
  size<K extends keyof T>(field: K, size: number): this {
    this.query[field as string] = { $size: size };
    return this;
  }

  /**
   * Add array element match
   */
  elemMatch<K extends keyof T>(field: K, conditions: QueryFilter<T>): this {
    this.query[field as string] = { $elemMatch: conditions };
    return this;
  }

  /**
   * Add geo near query
   */
  near<K extends keyof T>(field: K, coordinates: [number, number], maxDistance?: number): this {
    const nearQuery: any = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates,
        },
      },
    };
    
    if (maxDistance) {
      nearQuery.$near.$maxDistance = maxDistance;
    }
    
    this.query[field as string] = nearQuery;
    return this;
  }

  /**
   * Add geo within query
   */
  within<K extends keyof T>(field: K, geometry: any): this {
    this.query[field as string] = {
      $geoWithin: {
        $geometry: geometry,
      },
    };
    return this;
  }

  /**
   * Build final query with tenant isolation
   */
  build(): FilterQuery<T> {
    const finalQuery = { ...this.query };
    
    // Always include tenant ID if set
    if (this.tenantId) {
      finalQuery.tenantId = this.tenantId;
    }
    
    return finalQuery;
  }

  /**
   * Reset query builder
   */
  reset(): this {
    this.query = {};
    this.tenantId = undefined;
    return this;
  }

  /**
   * Get current query (for debugging)
   */
  getQuery(): FilterQuery<T> {
    return { ...this.query };
  }

  /**
   * Check if query is empty
   */
  isEmpty(): boolean {
    return Object.keys(this.query).length === 0;
  }

  /**
   * Clone query builder
   */
  clone(): QueryBuilder<T> {
    const cloned = new QueryBuilder<T>();
    cloned.query = { ...this.query };
    cloned.tenantId = this.tenantId;
    return cloned;
  }
}
