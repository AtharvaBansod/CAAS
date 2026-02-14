import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';
import { MongoClient } from 'mongodb';
import { RoomAuthorizer } from '../../src/rooms/room-authorizer';

describe('Room Authorization Integration Tests', () => {
  let redis: Redis;
  let mongoClient: MongoClient;
  let roomAuthorizer: RoomAuthorizer;

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
  const TEST_TENANT_ID = 'test-tenant-001';
  const TEST_CONVERSATION_ID = 'test-conv-001';
  const TEST_USER_ID = 'user-001';

  beforeAll(async () => {
    redis = new Redis(REDIS_URL);
    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();

    roomAuthorizer = new RoomAuthorizer({
      redis,
      mongoClient,
      cacheTtl: 300,
    });

    // Setup test conversation in MongoDB
    const db = mongoClient.db('caas_platform');
    const conversationsCollection = db.collection('conversations');
    
    await conversationsCollection.insertOne({
      conversation_id: TEST_CONVERSATION_ID,
      tenant_id: TEST_TENANT_ID,
      participants: [
        { user_id: TEST_USER_ID, role: 'owner' },
        { user_id: 'user-002', role: 'member' },
      ],
      created_at: new Date(),
    } as any);
  });

  afterAll(async () => {
    // Cleanup
    const db = mongoClient.db('caas_platform');
    await db.collection('conversations').deleteMany({ tenant_id: TEST_TENANT_ID });
    
    redis.disconnect();
    await mongoClient.close();
  });

  beforeEach(async () => {
    // Clear authorization cache
    const keys = await redis.keys(`authz:${TEST_TENANT_ID}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    // Clear bans and mutes
    const banKeys = await redis.keys(`ban:${TEST_TENANT_ID}:*`);
    if (banKeys.length > 0) {
      await redis.del(...banKeys);
    }

    const muteKeys = await redis.keys(`mute:${TEST_TENANT_ID}:*`);
    if (muteKeys.length > 0) {
      await redis.del(...muteKeys);
    }
  });

  it('should allow conversation member to join room', async () => {
    const result = await roomAuthorizer.canJoinRoom(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );

    expect(result.authorized).toBe(true);
    expect(result.role).toBe('owner');
  });

  it('should deny non-member from joining room', async () => {
    const result = await roomAuthorizer.canJoinRoom(
      'non-member-user',
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );

    expect(result.authorized).toBe(false);
    expect(result.reason).toContain('not a member');
  });

  it('should deny banned user from joining room', async () => {
    await roomAuthorizer.banUser(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID);

    const result = await roomAuthorizer.canJoinRoom(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );

    expect(result.authorized).toBe(false);
    expect(result.reason).toContain('banned');
  });

  it('should allow unbanned user to join room', async () => {
    await roomAuthorizer.banUser(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID);
    await roomAuthorizer.unbanUser(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID);

    const result = await roomAuthorizer.canJoinRoom(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );

    expect(result.authorized).toBe(true);
  });

  it('should deny muted user from sending messages', async () => {
    await roomAuthorizer.muteUser(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID);

    const result = await roomAuthorizer.canSendMessage(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );

    expect(result.authorized).toBe(false);
    expect(result.reason).toContain('muted');
  });

  it('should allow unmuted user to send messages', async () => {
    await roomAuthorizer.muteUser(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID);
    await roomAuthorizer.unmuteUser(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID);

    const result = await roomAuthorizer.canSendMessage(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );

    expect(result.authorized).toBe(true);
  });

  it('should allow owner to moderate', async () => {
    const result = await roomAuthorizer.canModerate(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );

    expect(result.authorized).toBe(true);
    expect(result.role).toBe('owner');
  });

  it('should deny regular member from moderating', async () => {
    const result = await roomAuthorizer.canModerate(
      'user-002',
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );

    expect(result.authorized).toBe(false);
    expect(result.reason).toContain('moderation permissions');
  });

  it('should allow owner to administer', async () => {
    const result = await roomAuthorizer.canAdminister(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );

    expect(result.authorized).toBe(true);
  });

  it('should cache authorization results', async () => {
    // First call - should query database
    await roomAuthorizer.canJoinRoom(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID);

    // Check cache
    const cacheKey = `authz:${TEST_TENANT_ID}:${TEST_CONVERSATION_ID}:${TEST_USER_ID}`;
    const cached = await redis.get(cacheKey);

    expect(cached).toBeDefined();
    const parsedCache = JSON.parse(cached!);
    expect(parsedCache.authorized).toBe(true);
  });

  it('should invalidate cache on ban', async () => {
    // Populate cache
    await roomAuthorizer.canJoinRoom(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID);

    // Ban user (should invalidate cache)
    await roomAuthorizer.banUser(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID);

    // Check cache is cleared
    const cacheKey = `authz:${TEST_TENANT_ID}:${TEST_CONVERSATION_ID}:${TEST_USER_ID}`;
    const cached = await redis.get(cacheKey);

    expect(cached).toBeNull();
  });

  it('should enforce tenant isolation', async () => {
    const otherTenantId = 'other-tenant';

    const result = await roomAuthorizer.canJoinRoom(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      otherTenantId
    );

    expect(result.authorized).toBe(false);
  });

  it('should support temporary bans with TTL', async () => {
    // Ban for 2 seconds
    await roomAuthorizer.banUser(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID, 2);

    // Should be banned immediately
    let result = await roomAuthorizer.canJoinRoom(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );
    expect(result.authorized).toBe(false);

    // Wait for ban to expire
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Should be able to join now
    result = await roomAuthorizer.canJoinRoom(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );
    expect(result.authorized).toBe(true);
  });

  it('should support temporary mutes with TTL', async () => {
    // Mute for 2 seconds
    await roomAuthorizer.muteUser(TEST_USER_ID, TEST_CONVERSATION_ID, TEST_TENANT_ID, 2);

    // Should be muted immediately
    let result = await roomAuthorizer.canSendMessage(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );
    expect(result.authorized).toBe(false);

    // Wait for mute to expire
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Should be able to send messages now
    result = await roomAuthorizer.canSendMessage(
      TEST_USER_ID,
      TEST_CONVERSATION_ID,
      TEST_TENANT_ID
    );
    expect(result.authorized).toBe(true);
  });
});
