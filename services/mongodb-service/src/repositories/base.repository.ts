import { Connection, Model, Document, FilterQuery, UpdateQuery, ClientSession } from 'mongoose';
import { getConnectionManager } from '../connections';
import { TenantContext } from '../types';
import { PaginationOptions, PaginatedResult, SortOptions, FindOptions } from './types';
import { QueryBuilder } from '../utils/query-builder';
import { NotFoundError, ValidationError } from '../errors';

/**
 * Base Repository Interface
 */
export interface IBaseRepository<T extends Document> {
  findById(id: string, tenantId: string, options?: FindOptions): Promise<T | null>;
  findOne(filter: FilterQuery<T>, tenantId: string, options?: FindOptions): Promise<T | null>;
  findMany(filter: FilterQuery<T>, tenantId: string, options?: FindOptions): Promise<T[]>;
  create(data: Partial<T>, tenantId: string, session?: ClientSession): Promise<T>;
  createMany(data: Partial<T>[], tenantId: string, session?: ClientSession): Promise<T[]>;
  update(id: string, data: Partial<T>, tenantId: string, session?: ClientSession): Promise<T | null>;
  updateMany(filter: FilterQuery<T>, data: Partial<T>, tenantId: string, session?: ClientSession): Promise<{ modifiedCount: number }>;
  delete(id: string, tenantId: string, session?: ClientSession): Promise<boolean>;
  softDelete(id: string, tenantId: string, session?: ClientSession): Promise<boolean>;
  count(filter: FilterQuery<T>, tenantId: string): Promise<number>;
  exists(filter: FilterQuery<T>, tenantId: string): Promise<boolean>;
  aggregate(pipeline: any[], tenantId: string): Promise<any[]>;
}

/**
 * Base Repository Implementation
 * Provides standard CRUD operations with tenant isolation
 */
export abstract class BaseRepository<T extends Document> implements IBaseRepository<T> {
  protected connection: Connection;
  protected model: Model<T>;
  protected queryBuilder: QueryBuilder<T>;

  constructor(model: Model<T>) {
    this.connection = getConnectionManager().getConnection();
    this.model = model;
    this.queryBuilder = new QueryBuilder<T>();
  }

  /**
   * Find document by ID with tenant isolation
   */
  async findById(id: string, tenantId: string, options: FindOptions = {}): Promise<T | null> {
    const filter = this.queryBuilder.where({ _id: id }).tenant(tenantId).build();
    
    let query = this.model.findOne(filter);
    
    if (options.projection) {
      query = query.select(options.projection);
    }
    
    if (options.populate) {
      query = query.populate(options.populate);
    }

    const doc = await query.exec();
    
    if (!doc && options.throwIfNotFound) {
      throw new NotFoundError(`Document with ID ${id} not found`);
    }
    
    return doc;
  }

  /**
   * Find one document with tenant isolation
   */
  async findOne(filter: FilterQuery<T>, tenantId: string, options: FindOptions = {}): Promise<T | null> {
    const queryFilter = this.queryBuilder.where(filter).tenant(tenantId).build();
    
    let query = this.model.findOne(queryFilter);
    
    if (options.projection) {
      query = query.select(options.projection);
    }
    
    if (options.populate) {
      query = query.populate(options.populate);
    }

    return await query.exec();
  }

  /**
   * Find multiple documents with tenant isolation and pagination
   */
  async findMany(filter: FilterQuery<T>, tenantId: string, options: FindOptions = {}): Promise<T[]> {
    let query = this.model.find(this.queryBuilder.where(filter).tenant(tenantId).build());
    
    if (options.projection) {
      query = query.select(options.projection);
    }
    
    if (options.sort) {
      query = query.sort(options.sort);
    }
    
    if (options.skip) {
      query = query.skip(options.skip);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.populate) {
      query = query.populate(options.populate);
    }

    return await query.exec();
  }

  /**
   * Create document with tenant context
   */
  async create(data: Partial<T>, tenantId: string, session?: ClientSession): Promise<T> {
    const documentData = {
      ...data,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    try {
      const doc = await this.model.create([documentData], { session });
      return doc[0];
    } catch (error) {
      throw new ValidationError(`Failed to create document: ${(error as Error).message}`);
    }
  }

  /**
   * Create multiple documents with tenant context
   */
  async createMany(data: Partial<T>[], tenantId: string, session?: ClientSession): Promise<T[]> {
    const documentsData = data.map(item => ({
      ...item,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as any[];

    try {
      return await this.model.create(documentsData, { session });
    } catch (error) {
      throw new ValidationError(`Failed to create documents: ${(error as Error).message}`);
    }
  }

  /**
   * Update document by ID with tenant isolation
   */
  async update(id: string, data: Partial<T>, tenantId: string, session?: ClientSession): Promise<T | null> {
    const filter = this.queryBuilder.where({ _id: id }).tenant(tenantId).build();
    const updateData = { ...data, updatedAt: new Date() } as UpdateQuery<T>;

    try {
      const doc = await this.model.findOneAndUpdate(filter, updateData, {
        new: true,
        runValidators: true,
        session,
      }).exec();

      if (!doc) {
        throw new NotFoundError(`Document with ID ${id} not found`);
      }

      return doc;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new ValidationError(`Failed to update document: ${(error as Error).message}`);
    }
  }

  /**
   * Update multiple documents with tenant isolation
   */
  async updateMany(
    filter: FilterQuery<T>, 
    data: Partial<T>, 
    tenantId: string, 
    session?: ClientSession
  ): Promise<{ modifiedCount: number }> {
    const queryFilter = this.queryBuilder.where(filter).tenant(tenantId).build();
    const updateData = { ...data, updatedAt: new Date() } as UpdateQuery<T>;

    try {
      const result = await this.model.updateMany(queryFilter, updateData, { session }).exec();
      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      throw new ValidationError(`Failed to update documents: ${(error as Error).message}`);
    }
  }

  /**
   * Delete document by ID with tenant isolation
   */
  async delete(id: string, tenantId: string, session?: ClientSession): Promise<boolean> {
    const filter = this.queryBuilder.where({ _id: id }).tenant(tenantId).build();

    try {
      const result = await this.model.deleteOne(filter, { session }).exec();
      return result.deletedCount > 0;
    } catch (error) {
      throw new ValidationError(`Failed to delete document: ${(error as Error).message}`);
    }
  }

  /**
   * Soft delete document by ID with tenant isolation
   */
  async softDelete(id: string, tenantId: string, session?: ClientSession): Promise<boolean> {
    return await this.update(id, { deletedAt: new Date() } as Partial<T>, tenantId, session).then(() => true);
  }

  /**
   * Count documents with tenant isolation
   */
  async count(filter: FilterQuery<T>, tenantId: string): Promise<number> {
    const queryFilter = this.queryBuilder.where(filter).tenant(tenantId).build();
    
    try {
      return await this.model.countDocuments(queryFilter).exec();
    } catch (error) {
      throw new ValidationError(`Failed to count documents: ${(error as Error).message}`);
    }
  }

  /**
   * Check if document exists with tenant isolation
   */
  async exists(filter: FilterQuery<T>, tenantId: string): Promise<boolean> {
    const queryFilter = this.queryBuilder.where(filter).tenant(tenantId).build();
    
    try {
      const doc = await this.model.findOne(queryFilter).select('_id').exec();
      return !!doc;
    } catch (error) {
      throw new ValidationError(`Failed to check document existence: ${(error as Error).message}`);
    }
  }

  /**
   * Aggregate with tenant isolation
   */
  async aggregate(pipeline: any[], tenantId: string): Promise<any[]> {
    // Add tenant match at the beginning of pipeline
    const tenantPipeline = [
      { $match: { tenantId } },
      ...pipeline,
    ];

    try {
      return await this.model.aggregate(tenantPipeline).exec();
    } catch (error) {
      throw new ValidationError(`Failed to aggregate documents: ${(error as Error).message}`);
    }
  }

  /**
   * Find documents with pagination
   */
  async findWithPagination(
    filter: FilterQuery<T>,
    tenantId: string,
    pagination: PaginationOptions,
    options: FindOptions = {}
  ): Promise<PaginatedResult<T>> {
    const { page, limit, sort } = pagination;
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.count(filter, tenantId);

    // Get documents
    const documents = await this.findMany(filter, tenantId, {
      ...options,
      skip,
      limit,
      sort,
    });

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}
