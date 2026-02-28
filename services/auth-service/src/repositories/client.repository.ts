/**
 * Client Repository
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Handles all SAAS client data operations with proper indexing and caching
 */

import { MongoDBConnection } from '../storage/mongodb-connection';
import { RedisConnection } from '../storage/redis-connection';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface ClientApiKey {
  key_hash: string;
  key_prefix: string; // First 8 chars of key for identification
  created_at: Date;
  last_used: Date | null;
  revoked: boolean;
}

export interface Client {
  client_id: string;
  tenant_id: string;
  company_name: string;
  email: string;
  password_hash: string;
  plan: 'free' | 'business' | 'enterprise';
  api_keys: {
    primary: ClientApiKey | null;
    secondary: ClientApiKey | null;
  };
  ip_whitelist: string[];
  origin_whitelist: string[];
  active_project_id?: string;
  active_project_name?: string;
  active_project_stack?: string;
  active_project_environment?: 'development' | 'staging' | 'production';
  projects?: Array<{
    project_id: string;
    slug: string;
    name: string;
    stack: string;
    environment: 'development' | 'staging' | 'production';
    created_at: Date;
    status: 'active' | 'archived';
  }>;
  project_context?: {
    schema_version: number;
    compatibility_mode: boolean;
    source: 'projects' | 'projects_repaired' | 'legacy_fields' | 'default_generated';
    migrated_at: Date;
    last_checked_at: Date;
  };
  status: 'active' | 'suspended' | 'deleted';
  created_at: Date;
  updated_at: Date;
}

export interface ClientProject {
  project_id: string;
  slug: string;
  name: string;
  stack: string;
  environment: 'development' | 'staging' | 'production';
  created_at: Date;
  status: 'active' | 'archived';
}

type ProjectContextSource = 'projects' | 'projects_repaired' | 'legacy_fields' | 'default_generated';

export class ClientRepository {
  private readonly COLLECTION = 'clients';
  private readonly CACHE_PREFIX = 'client:';
  private readonly APIKEY_CACHE_PREFIX = 'apikey:';
  private readonly CACHE_TTL = 300; // 5 minutes

  async createClient(data: Partial<Client>): Promise<Client> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    const hasSeedProjects = ((data.projects as ClientProject[] | undefined) || []).length > 0;
    const hasLegacyProjectFields =
      !!data.active_project_id ||
      !!data.active_project_name ||
      !!data.active_project_stack ||
      !!data.active_project_environment;
    const initialContextSource: ProjectContextSource = hasSeedProjects
      ? 'projects'
      : hasLegacyProjectFields
        ? 'legacy_fields'
        : 'default_generated';

    const client: Client = {
      client_id: uuidv4(),
      tenant_id: uuidv4(),
      company_name: data.company_name!,
      email: data.email!,
      password_hash: data.password_hash!,
      plan: data.plan || 'free',
      api_keys: {
        primary: null,
        secondary: null,
      },
      ip_whitelist: data.ip_whitelist || [],
      origin_whitelist: data.origin_whitelist || [],
      active_project_id: data.active_project_id,
      active_project_name: data.active_project_name,
      active_project_stack: data.active_project_stack,
      active_project_environment: data.active_project_environment,
      projects: (data.projects as ClientProject[] | undefined) || [],
      project_context: {
        schema_version: 1,
        compatibility_mode: !hasSeedProjects,
        source: initialContextSource,
        migrated_at: new Date(),
        last_checked_at: new Date(),
      },
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection(this.COLLECTION).insertOne(client);

    // Cache the client
    await redis.setex(
      `${this.CACHE_PREFIX}${client.client_id}`,
      this.CACHE_TTL,
      JSON.stringify(client)
    );

    return client;
  }

  async findById(client_id: string): Promise<Client | null> {
    const redis = RedisConnection.getClient();

    // Check cache first
    const cached = await redis.get(`${this.CACHE_PREFIX}${client_id}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as Client;
        return await this.ensureProjectContext(parsed);
      } catch (e) {
        console.error(`Failed to parse cached client ${client_id}:`, e);
        // Continue to DB if cache is corrupted
      }
    }

    const db = MongoDBConnection.getDb();
    const client = await db.collection(this.COLLECTION).findOne({ client_id }) as any;

    if (client) {
      const normalizedClient = await this.ensureProjectContext(client as Client);
      await redis.setex(
        `${this.CACHE_PREFIX}${client_id}`,
        this.CACHE_TTL,
        JSON.stringify(normalizedClient)
      );
      return normalizedClient;
    }

    return client as Client | null;
  }

  async findByEmail(email: string): Promise<Client | null> {
    const db = MongoDBConnection.getDb();
    const client = await db.collection(this.COLLECTION).findOne({
      email,
      status: { $ne: 'deleted' },
    }) as any;
    if (!client) return null;
    return this.ensureProjectContext(client as Client);
  }

  async findByTenantId(tenant_id: string): Promise<Client | null> {
    const db = MongoDBConnection.getDb();
    const client = await db.collection(this.COLLECTION).findOne({
      tenant_id,
      status: 'active',
    }) as any;
    if (!client) return null;
    return this.ensureProjectContext(client as Client);
  }

  async findByApiKeyHash(keyHash: string): Promise<Client | null> {
    const redis = RedisConnection.getClient();

    // Check cache: apikey:{hash} -> client_id
    const cachedClientId = await redis.get(`${this.APIKEY_CACHE_PREFIX}${keyHash}`);
    if (cachedClientId) {
      return this.findById(cachedClientId);
    }

    const db = MongoDBConnection.getDb();
    const client = await db.collection(this.COLLECTION).findOne({
      $or: [
        { 'api_keys.primary.key_hash': keyHash, 'api_keys.primary.revoked': false },
        { 'api_keys.secondary.key_hash': keyHash, 'api_keys.secondary.revoked': false },
      ],
      status: 'active',
    }) as any;

    if (client) {
      const normalizedClient = await this.ensureProjectContext(client as Client);
      // Cache the mapping
      await redis.setex(
        `${this.APIKEY_CACHE_PREFIX}${keyHash}`,
        this.CACHE_TTL,
        normalizedClient.client_id
      );
      return normalizedClient;
    }

    return client as Client | null;
  }

  async updateApiKeys(client_id: string, api_keys: Client['api_keys']): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          api_keys,
          updated_at: new Date(),
        },
      }
    );

    // Invalidate caches
    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
    // Invalidate all apikey caches for this client (brute force approach)
    if (api_keys.primary?.key_hash) {
      await redis.del(`${this.APIKEY_CACHE_PREFIX}${api_keys.primary.key_hash}`);
    }
    if (api_keys.secondary?.key_hash) {
      await redis.del(`${this.APIKEY_CACHE_PREFIX}${api_keys.secondary.key_hash}`);
    }
  }

  async updateApiKeyLastUsed(client_id: string, keyType: 'primary' | 'secondary'): Promise<void> {
    const db = MongoDBConnection.getDb();
    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          [`api_keys.${keyType}.last_used`]: new Date(),
        },
      }
    );
  }

  async updateIpWhitelist(client_id: string, ips: string[]): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          ip_whitelist: ips,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
  }

  async updateOriginWhitelist(client_id: string, origins: string[]): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          origin_whitelist: origins,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
  }

  async updatePassword(client_id: string, passwordHash: string): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          password_hash: passwordHash,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
  }

  async updateStatus(client_id: string, status: Client['status']): Promise<void> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          status,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
  }

  static hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  static generateApiKey(prefix: string = 'caas'): string {
    const env = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
    const randomPart = crypto.randomBytes(32).toString('hex');
    return `${prefix}_${env}_${randomPart}`;
  }

  async ensureIndexes(): Promise<void> {
    const db = MongoDBConnection.getDb();
    const collection = db.collection(this.COLLECTION);

    await collection.createIndex({ client_id: 1 }, { unique: true });
    await collection.createIndex({ tenant_id: 1 }, { unique: true });
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ tenant_id: 1, active_project_id: 1 });
    await collection.createIndex({ client_id: 1, 'projects.project_id': 1 });
    await collection.createIndex({ 'api_keys.primary.key_hash': 1 });
    await collection.createIndex({ 'api_keys.secondary.key_hash': 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ created_at: -1 });
  }

  async listProjects(client_id: string): Promise<ClientProject[]> {
    const client = await this.findById(client_id);
    if (!client) {
      throw new Error('Client not found');
    }
    return (client.projects || []).filter((project) => project.status !== 'archived') as ClientProject[];
  }

  async createProject(
    client_id: string,
    project: {
      name: string;
      stack: string;
      environment: 'development' | 'staging' | 'production';
    }
  ): Promise<ClientProject> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();
    const existingClient = await this.findById(client_id);

    if (!existingClient) {
      throw new Error('Client not found');
    }

    const newProject: ClientProject = {
      project_id: uuidv4(),
      slug: this.buildUniqueProjectSlug(project.name, (existingClient.projects || []) as ClientProject[]),
      name: project.name,
      stack: this.normalizeProjectStack(project.stack),
      environment: this.normalizeProjectEnvironment(project.environment),
      created_at: new Date(),
      status: 'active',
    };

    await (db.collection(this.COLLECTION) as any).updateOne(
      { client_id },
      {
        $push: { projects: newProject },
        $set: {
          active_project_id: newProject.project_id,
          active_project_name: newProject.name,
          active_project_stack: newProject.stack,
          active_project_environment: newProject.environment,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
    return newProject;
  }

  async updateProject(
    client_id: string,
    project_id: string,
    updates: {
      name?: string;
      stack?: string;
      environment?: 'development' | 'staging' | 'production';
    }
  ): Promise<ClientProject> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();
    const client = await this.findById(client_id);

    if (!client) {
      throw new Error('Client not found');
    }

    const projects = [...((client.projects || []) as ClientProject[])];
    const index = projects.findIndex((project) => project.project_id === project_id);
    if (index < 0) {
      throw new Error('Project not found');
    }

    const existing = projects[index];
    if (existing.status === 'archived') {
      throw new Error('Archived project cannot be updated');
    }

    const sanitizedName = updates.name?.trim();
    const nextProject: ClientProject = {
      ...existing,
      name: sanitizedName && sanitizedName.length > 0 ? sanitizedName : existing.name,
      stack: updates.stack ? this.normalizeProjectStack(updates.stack) : existing.stack,
      environment: updates.environment
        ? this.normalizeProjectEnvironment(updates.environment)
        : existing.environment,
      slug:
        sanitizedName && sanitizedName.length > 0
          ? this.buildUniqueProjectSlug(
            sanitizedName,
            projects.filter((_, projectIndex) => projectIndex !== index)
          )
          : existing.slug,
    };

    projects[index] = nextProject;

    const setPayload: Record<string, unknown> = {
      projects,
      updated_at: new Date(),
    };

    if (client.active_project_id === project_id) {
      setPayload.active_project_name = nextProject.name;
      setPayload.active_project_stack = nextProject.stack;
      setPayload.active_project_environment = nextProject.environment;
    }

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: setPayload,
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
    return nextProject;
  }

  async archiveProject(
    client_id: string,
    project_id: string
  ): Promise<{ archived_project: ClientProject; active_project: ClientProject }> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();
    const client = await this.findById(client_id);

    if (!client) {
      throw new Error('Client not found');
    }

    const projects = [...((client.projects || []) as ClientProject[])];
    const index = projects.findIndex((project) => project.project_id === project_id);
    if (index < 0) {
      throw new Error('Project not found');
    }

    const target = projects[index];
    const activeProjects = projects.filter((project) => project.status !== 'archived');
    if (
      target.status !== 'archived' &&
      activeProjects.length <= 1 &&
      activeProjects[0]?.project_id === project_id
    ) {
      throw new Error('At least one active project is required');
    }

    const archivedProject: ClientProject = {
      ...target,
      status: 'archived',
    };
    projects[index] = archivedProject;

    let activeProject =
      projects.find(
        (project) =>
          project.project_id === client.active_project_id && project.status !== 'archived'
      ) || null;

    if (!activeProject || activeProject.project_id === project_id) {
      activeProject = projects.find((project) => project.status !== 'archived') || null;
    }

    if (!activeProject) {
      throw new Error('At least one active project is required');
    }

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          projects,
          active_project_id: activeProject.project_id,
          active_project_name: activeProject.name,
          active_project_stack: activeProject.stack,
          active_project_environment: activeProject.environment,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
    return {
      archived_project: archivedProject,
      active_project: activeProject,
    };
  }

  async selectActiveProject(client_id: string, project_id: string): Promise<ClientProject> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();
    const client = await this.findById(client_id);

    if (!client) {
      throw new Error('Client not found');
    }

    const project = (client.projects || []).find(
      (p: any) => p.project_id === project_id && p.status !== 'archived'
    ) as ClientProject | undefined;

    if (!project) {
      throw new Error('Project not found');
    }

    await db.collection(this.COLLECTION).updateOne(
      { client_id },
      {
        $set: {
          active_project_id: project.project_id,
          active_project_name: project.name,
          active_project_stack: project.stack,
          active_project_environment: project.environment,
          updated_at: new Date(),
        },
      }
    );

    await redis.del(`${this.CACHE_PREFIX}${client_id}`);
    return project;
  }

  private normalizeProjectStack(stack?: string): string {
    const value = (stack || 'custom').trim().toLowerCase();
    return value || 'custom';
  }

  private normalizeProjectEnvironment(environment?: string): 'development' | 'staging' | 'production' {
    if (environment === 'staging' || environment === 'production') return environment;
    return 'development';
  }

  private toProjectSlug(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'project';
  }

  private buildUniqueProjectSlug(name: string, existingProjects: ClientProject[]): string {
    const base = this.toProjectSlug(name);
    const existing = new Set((existingProjects || []).map((project) => project.slug).filter(Boolean));
    if (!existing.has(base)) return base;

    let suffix = 2;
    let candidate = `${base}-${suffix}`;
    while (existing.has(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    return candidate;
  }

  private async ensureProjectContext(client: Client): Promise<Client> {
    const db = MongoDBConnection.getDb();
    const redis = RedisConnection.getClient();

    const currentProjects = ((client.projects || []) as ClientProject[]).map((project) => ({
      ...project,
      slug: project.slug || this.toProjectSlug(project.name || 'project'),
      stack: this.normalizeProjectStack(project.stack),
      environment: this.normalizeProjectEnvironment(project.environment),
      created_at: project.created_at ? new Date(project.created_at) : new Date(),
      status: project.status || 'active',
    }));

    let normalizedProjects = currentProjects;
    let activeProject = currentProjects.find(
      (project) => project.project_id === client.active_project_id && project.status !== 'archived'
    );
    let contextSource: ProjectContextSource = 'projects';
    let compatibilityMode = false;

    let needsUpdate = false;

    if (!activeProject && currentProjects.length > 0) {
      activeProject = currentProjects.find((project) => project.status !== 'archived') || currentProjects[0];
      contextSource = 'projects_repaired';
      compatibilityMode = true;
      needsUpdate = true;
    }

    if (!activeProject) {
      const hasLegacyFields =
        !!client.active_project_id ||
        !!client.active_project_name ||
        !!client.active_project_stack ||
        !!client.active_project_environment;
      const fallbackProject: ClientProject = {
        project_id: client.active_project_id || uuidv4(),
        slug: this.toProjectSlug(client.active_project_name || `${client.company_name} default`),
        name: client.active_project_name || `${client.company_name} Default`,
        stack: this.normalizeProjectStack(client.active_project_stack),
        environment: this.normalizeProjectEnvironment(client.active_project_environment),
        created_at: client.created_at || new Date(),
        status: 'active',
      };
      normalizedProjects = [fallbackProject];
      activeProject = fallbackProject;
      contextSource = hasLegacyFields ? 'legacy_fields' : 'default_generated';
      compatibilityMode = true;
      needsUpdate = true;
    }

    const existingContext = client.project_context;
    const existingMigratedAt = existingContext?.migrated_at
      ? new Date(existingContext.migrated_at)
      : new Date();
    const projectContext = {
      schema_version: 1,
      compatibility_mode: compatibilityMode,
      source: contextSource,
      migrated_at: existingMigratedAt,
      last_checked_at: new Date(),
    };

    if (
      !client.active_project_id ||
      client.active_project_id !== activeProject.project_id ||
      client.active_project_name !== activeProject.name ||
      client.active_project_stack !== activeProject.stack ||
      client.active_project_environment !== activeProject.environment ||
      normalizedProjects.some((project) => !project.slug) ||
      !existingContext ||
      existingContext.schema_version !== projectContext.schema_version ||
      existingContext.compatibility_mode !== projectContext.compatibility_mode ||
      existingContext.source !== projectContext.source
    ) {
      needsUpdate = true;
    }

    const normalizedClient: Client = {
      ...client,
      projects: normalizedProjects,
      active_project_id: activeProject.project_id,
      active_project_name: activeProject.name,
      active_project_stack: activeProject.stack,
      active_project_environment: activeProject.environment,
      project_context: projectContext,
    };

    if (needsUpdate) {
      if (projectContext.compatibility_mode) {
        console.warn(
          `[project-context-compat] client=${client.client_id} source=${projectContext.source} active_project=${activeProject.project_id}`
        );
      }

      await db.collection(this.COLLECTION).updateOne(
        { client_id: client.client_id },
        {
          $set: {
            projects: normalizedProjects,
            active_project_id: activeProject.project_id,
            active_project_name: activeProject.name,
            active_project_stack: activeProject.stack,
            active_project_environment: activeProject.environment,
            project_context: projectContext,
            updated_at: new Date(),
          },
        }
      );
      await redis.del(`${this.CACHE_PREFIX}${client.client_id}`);
    }

    return normalizedClient;
  }
}
