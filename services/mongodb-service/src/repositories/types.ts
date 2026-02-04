import { Document, ClientSession } from 'mongoose';

/**
 * Repository Find Options
 */
export interface FindOptions {
  projection?: Record<string, number>;
  sort?: Record<string, 1 | -1>;
  skip?: number;
  limit?: number;
  populate?: string | string[] | Record<string, any>;
  throwIfNotFound?: boolean;
}

/**
 * Pagination Options
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
}

/**
 * Sort Options
 */
export interface SortOptions {
  field: string;
  direction: 1 | -1;
}

/**
 * Query Filter Type
 */
export type QueryFilter<T> = {
  [P in keyof T]?: T[P] | { $in: T[P][] } | { $nin: T[P][] } | { $gt: T[P] } | { $gte: T[P] } | { $lt: T[P] } | { $lte: T[P] } | { $ne: T[P] } | { $regex: RegExp | string };
} & {
  $and?: QueryFilter<T>[];
  $or?: QueryFilter<T>[];
  $nor?: QueryFilter<T>[];
  $not?: QueryFilter<T>;
};

/**
 * Repository Result Type
 */
export interface RepositoryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Paginated Result Type
 */
export interface PaginatedResult<T> {
  documents: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Transaction Options
 */
export interface TransactionOptions {
  session?: ClientSession;
  commit?: boolean;
  retry?: boolean;
}

/**
 * Bulk Operation Result
 */
export interface BulkOperationResult {
  insertedCount?: number;
  matchedCount?: number;
  modifiedCount?: number;
  deletedCount?: number;
  upsertedCount?: number;
  upsertedIds?: Record<string, any>;
}

/**
 * Index Options
 */
export interface IndexOptions {
  unique?: boolean;
  sparse?: boolean;
  background?: boolean;
  expireAfterSeconds?: number;
  name?: string;
}

/**
 * Database Operation Context
 */
export interface DatabaseContext {
  tenantId: string;
  userId?: string;
  requestId?: string;
  timestamp: Date;
}

/**
 * Migration Interface
 */
export interface Migration {
  version: string;
  description: string;
  up: (connection: any) => Promise<void>;
  down: (connection: any) => Promise<void>;
}

/**
 * Seed Configuration
 */
export interface SeedConfig {
  tenants: number;
  usersPerTenant: number;
  conversationsPerUser: number;
  messagesPerConversation: number;
  filesPerTenant: number;
  groupsPerTenant: number;
}
