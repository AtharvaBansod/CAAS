import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Redis from 'ioredis';
import { RoomStateManager } from '../../src/rooms/room-state-manager';

describe('Room State Management Integration Tests', () => {
  let redis: Redis;
  let roomStateManager: RoomStateManager;

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  const TEST_TENANT_ID = 'test-tenant-001';
  const TEST_CONVERSATION_ID = 'test-conv-001';

  beforeAll(async () => {
    redis = new Redis(REDIS_URL);
    roomStateManager = new RoomStateManager(redis, 24);
  });

  afterAll(async () => {
    redis.disconnect();
  });

  beforeEach(async () => {
    // Clean up test data
    const keys = await redis.keys(`room:${TEST_TENANT_ID}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  it('should create a room with initial state', async () => {
    const roomId = `room-${Date.now()}`;
    const ownerId = 'user-001';
    const socketId = 'socket-001';

    const roomState = await roomStateManager.createRoom(
      roomId,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      ownerId,
      socketId
    );

    expect(roomState).toBeDefined();
    expect(roomState.room_id).toBe(roomId);
    expect(roomState.tenant_id).toBe(TEST_TENANT_ID);
    expect(roomState.members).toHaveLength(1);
    expect(roomState.members[0].user_id).toBe(ownerId);
    expect(roomState.members[0].role).toBe('owner');
  });

  it('should add member to room', async () => {
    const roomId = `room-${Date.now()}`;
    const ownerId = 'user-001';
    const memberId = 'user-002';

    await roomStateManager.createRoom(
      roomId,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      ownerId,
      'socket-001'
    );

    await roomStateManager.addMember(
      roomId,
      TEST_TENANT_ID,
      memberId,
      'socket-002',
      'member'
    );

    const roomState = await roomStateManager.getRoomState(roomId, TEST_TENANT_ID);
    expect(roomState?.members).toHaveLength(2);
    expect(roomState?.members.find((m) => m.user_id === memberId)).toBeDefined();
  });

  it('should remove member from room', async () => {
    const roomId = `room-${Date.now()}`;
    const ownerId = 'user-001';
    const memberId = 'user-002';

    await roomStateManager.createRoom(
      roomId,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      ownerId,
      'socket-001'
    );

    await roomStateManager.addMember(
      roomId,
      TEST_TENANT_ID,
      memberId,
      'socket-002',
      'member'
    );

    await roomStateManager.removeMember(roomId, TEST_TENANT_ID, memberId);

    const roomState = await roomStateManager.getRoomState(roomId, TEST_TENANT_ID);
    expect(roomState?.members).toHaveLength(1);
    expect(roomState?.members.find((m) => m.user_id === memberId)).toBeUndefined();
  });

  it('should delete room when last member leaves', async () => {
    const roomId = `room-${Date.now()}`;
    const ownerId = 'user-001';

    await roomStateManager.createRoom(
      roomId,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      ownerId,
      'socket-001'
    );

    await roomStateManager.removeMember(roomId, TEST_TENANT_ID, ownerId);

    const roomState = await roomStateManager.getRoomState(roomId, TEST_TENANT_ID);
    expect(roomState).toBeNull();
  });

  it('should persist room state in Redis', async () => {
    const roomId = `room-${Date.now()}`;
    const ownerId = 'user-001';

    await roomStateManager.createRoom(
      roomId,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      ownerId,
      'socket-001'
    );

    // Check Redis directly
    const key = `room:${TEST_TENANT_ID}:${roomId}`;
    const data = await redis.get(key);
    expect(data).toBeDefined();

    const parsed = JSON.parse(data!);
    expect(parsed.room_id).toBe(roomId);
  });

  it('should recover room states on restart', async () => {
    const roomId1 = `room-${Date.now()}-1`;
    const roomId2 = `room-${Date.now()}-2`;

    await roomStateManager.createRoom(
      roomId1,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      'user-001',
      'socket-001'
    );

    await roomStateManager.createRoom(
      roomId2,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      'user-002',
      'socket-002'
    );

    const recoveredRooms = await roomStateManager.recoverRoomStates();
    const testRooms = recoveredRooms.filter((r) => r.tenant_id === TEST_TENANT_ID);

    expect(testRooms.length).toBeGreaterThanOrEqual(2);
  });

  it('should update member role', async () => {
    const roomId = `room-${Date.now()}`;
    const ownerId = 'user-001';
    const memberId = 'user-002';

    await roomStateManager.createRoom(
      roomId,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      ownerId,
      'socket-001'
    );

    await roomStateManager.addMember(
      roomId,
      TEST_TENANT_ID,
      memberId,
      'socket-002',
      'member'
    );

    await roomStateManager.updateMemberRole(roomId, TEST_TENANT_ID, memberId, 'moderator');

    const role = await roomStateManager.getMemberRole(roomId, TEST_TENANT_ID, memberId);
    expect(role).toBe('moderator');
  });

  it('should track room activity', async () => {
    const roomId = `room-${Date.now()}`;
    const ownerId = 'user-001';

    await roomStateManager.createRoom(
      roomId,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      ownerId,
      'socket-001'
    );

    const initialState = await roomStateManager.getRoomState(roomId, TEST_TENANT_ID);
    const initialActivity = initialState?.metadata.last_activity;

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 100));

    await roomStateManager.updateActivity(roomId, TEST_TENANT_ID);

    const updatedState = await roomStateManager.getRoomState(roomId, TEST_TENANT_ID);
    const updatedActivity = updatedState?.metadata.last_activity;

    expect(updatedActivity).not.toEqual(initialActivity);
    expect(updatedState?.metadata.message_count).toBe(1);
  });

  it('should get room metrics', async () => {
    const roomId = `room-${Date.now()}`;
    const ownerId = 'user-001';

    await roomStateManager.createRoom(
      roomId,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      ownerId,
      'socket-001'
    );

    await roomStateManager.updateActivity(roomId, TEST_TENANT_ID);

    const metrics = await roomStateManager.getRoomMetrics(roomId, TEST_TENANT_ID);

    expect(metrics).toBeDefined();
    expect(metrics?.member_count).toBe(1);
    expect(metrics?.activity_level).toBe('high');
  });

  it('should cleanup inactive rooms', async () => {
    // Create a room with very short TTL for testing
    const shortTtlManager = new RoomStateManager(redis, 0.001); // ~3.6 seconds
    const roomId = `room-${Date.now()}`;

    await shortTtlManager.createRoom(
      roomId,
      TEST_TENANT_ID,
      TEST_CONVERSATION_ID,
      'user-001',
      'socket-001'
    );

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const deletedCount = await shortTtlManager.cleanupInactiveRooms(TEST_TENANT_ID);
    expect(deletedCount).toBeGreaterThan(0);
  });
});
