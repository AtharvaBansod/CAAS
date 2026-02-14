import Redis from 'ioredis';
import { EventEmitter } from 'events';

interface RoomMember {
  user_id: string;
  socket_id: string;
  joined_at: Date;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  metadata?: Record<string, any>;
}

interface RoomState {
  room_id: string;
  tenant_id: string;
  conversation_id: string;
  members: RoomMember[];
  metadata: {
    created_at: Date;
    last_activity: Date;
    message_count?: number;
  };
}

interface RoomMetrics {
  member_count: number;
  message_rate: number;
  activity_level: 'low' | 'medium' | 'high';
}

export class RoomStateManager extends EventEmitter {
  private redis: Redis;
  private ttlHours: number;

  constructor(redis: Redis, ttlHours: number = 24) {
    super();
    this.redis = redis;
    this.ttlHours = ttlHours;
  }

  /**
   * Create a new room
   */
  async createRoom(
    roomId: string,
    tenantId: string,
    conversationId: string,
    ownerId: string,
    socketId: string
  ): Promise<RoomState> {
    const roomState: RoomState = {
      room_id: roomId,
      tenant_id: tenantId,
      conversation_id: conversationId,
      members: [
        {
          user_id: ownerId,
          socket_id: socketId,
          joined_at: new Date(),
          role: 'owner',
        },
      ],
      metadata: {
        created_at: new Date(),
        last_activity: new Date(),
        message_count: 0,
      },
    };

    await this.saveRoomState(roomState);
    this.emit('room:created', { room_id: roomId, tenant_id: tenantId });

    return roomState;
  }

  /**
   * Delete a room
   */
  async deleteRoom(roomId: string, tenantId: string): Promise<void> {
    const key = this.getRoomKey(roomId, tenantId);
    await this.redis.del(key);
    this.emit('room:deleted', { room_id: roomId, tenant_id: tenantId });
  }

  /**
   * Add member to room
   */
  async addMember(
    roomId: string,
    tenantId: string,
    userId: string,
    socketId: string,
    role: RoomMember['role'] = 'member'
  ): Promise<void> {
    const roomState = await this.getRoomState(roomId, tenantId);
    
    if (!roomState) {
      throw new Error(`Room not found: ${roomId}`);
    }

    // Check if member already exists
    const existingMember = roomState.members.find((m) => m.user_id === userId);
    if (existingMember) {
      // Update socket_id if changed
      existingMember.socket_id = socketId;
    } else {
      // Add new member
      roomState.members.push({
        user_id: userId,
        socket_id: socketId,
        joined_at: new Date(),
        role,
      });
    }

    roomState.metadata.last_activity = new Date();
    await this.saveRoomState(roomState);

    this.emit('room:member_joined', {
      room_id: roomId,
      tenant_id: tenantId,
      user_id: userId,
    });
  }

  /**
   * Remove member from room
   */
  async removeMember(roomId: string, tenantId: string, userId: string): Promise<void> {
    const roomState = await this.getRoomState(roomId, tenantId);
    
    if (!roomState) {
      return; // Room doesn't exist, nothing to do
    }

    roomState.members = roomState.members.filter((m) => m.user_id !== userId);
    roomState.metadata.last_activity = new Date();

    if (roomState.members.length === 0) {
      // Delete room if no members left
      await this.deleteRoom(roomId, tenantId);
    } else {
      await this.saveRoomState(roomState);
    }

    this.emit('room:member_left', {
      room_id: roomId,
      tenant_id: tenantId,
      user_id: userId,
    });
  }

  /**
   * Update member role
   */
  async updateMemberRole(
    roomId: string,
    tenantId: string,
    userId: string,
    role: RoomMember['role']
  ): Promise<void> {
    const roomState = await this.getRoomState(roomId, tenantId);
    
    if (!roomState) {
      throw new Error(`Room not found: ${roomId}`);
    }

    const member = roomState.members.find((m) => m.user_id === userId);
    if (!member) {
      throw new Error(`Member not found: ${userId}`);
    }

    member.role = role;
    roomState.metadata.last_activity = new Date();
    await this.saveRoomState(roomState);

    this.emit('room:member_role_updated', {
      room_id: roomId,
      tenant_id: tenantId,
      user_id: userId,
      role,
    });
  }

  /**
   * Get room state
   */
  async getRoomState(roomId: string, tenantId: string): Promise<RoomState | null> {
    const key = this.getRoomKey(roomId, tenantId);
    const data = await this.redis.get(key);

    if (data) {
      const parsed = JSON.parse(data);
      // Convert date strings back to Date objects
      parsed.metadata.created_at = new Date(parsed.metadata.created_at);
      parsed.metadata.last_activity = new Date(parsed.metadata.last_activity);
      parsed.members.forEach((m: RoomMember) => {
        m.joined_at = new Date(m.joined_at);
      });
      return parsed;
    }

    return null;
  }

  /**
   * Get room members
   */
  async getRoomMembers(roomId: string, tenantId: string): Promise<RoomMember[]> {
    const roomState = await this.getRoomState(roomId, tenantId);
    return roomState?.members || [];
  }

  /**
   * Check if user is in room
   */
  async isMember(roomId: string, tenantId: string, userId: string): Promise<boolean> {
    const members = await this.getRoomMembers(roomId, tenantId);
    return members.some((m) => m.user_id === userId);
  }

  /**
   * Get member role
   */
  async getMemberRole(
    roomId: string,
    tenantId: string,
    userId: string
  ): Promise<RoomMember['role'] | null> {
    const members = await this.getRoomMembers(roomId, tenantId);
    const member = members.find((m) => m.user_id === userId);
    return member?.role || null;
  }

  /**
   * Update room activity
   */
  async updateActivity(roomId: string, tenantId: string): Promise<void> {
    const roomState = await this.getRoomState(roomId, tenantId);
    
    if (roomState) {
      roomState.metadata.last_activity = new Date();
      roomState.metadata.message_count = (roomState.metadata.message_count || 0) + 1;
      await this.saveRoomState(roomState);
    }
  }

  /**
   * Get room metrics
   */
  async getRoomMetrics(roomId: string, tenantId: string): Promise<RoomMetrics | null> {
    const roomState = await this.getRoomState(roomId, tenantId);
    
    if (!roomState) {
      return null;
    }

    const now = Date.now();
    const lastActivity = roomState.metadata.last_activity.getTime();
    const minutesSinceActivity = (now - lastActivity) / (1000 * 60);

    let activityLevel: 'low' | 'medium' | 'high' = 'low';
    if (minutesSinceActivity < 5) {
      activityLevel = 'high';
    } else if (minutesSinceActivity < 30) {
      activityLevel = 'medium';
    }

    return {
      member_count: roomState.members.length,
      message_rate: roomState.metadata.message_count || 0,
      activity_level: activityLevel,
    };
  }

  /**
   * Get all rooms for tenant
   */
  async getTenantRooms(tenantId: string): Promise<RoomState[]> {
    const pattern = `room:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    
    const rooms: RoomState[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.metadata.created_at = new Date(parsed.metadata.created_at);
        parsed.metadata.last_activity = new Date(parsed.metadata.last_activity);
        parsed.members.forEach((m: RoomMember) => {
          m.joined_at = new Date(m.joined_at);
        });
        rooms.push(parsed);
      }
    }

    return rooms;
  }

  /**
   * Clean up inactive rooms
   */
  async cleanupInactiveRooms(tenantId?: string): Promise<number> {
    const pattern = tenantId ? `room:${tenantId}:*` : 'room:*';
    const keys = await this.redis.keys(pattern);
    
    let deletedCount = 0;
    const now = Date.now();
    const ttlMs = this.ttlHours * 60 * 60 * 1000;

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const roomState: RoomState = JSON.parse(data);
        const lastActivity = new Date(roomState.metadata.last_activity).getTime();
        
        if (now - lastActivity > ttlMs) {
          await this.redis.del(key);
          deletedCount++;
          this.emit('room:cleaned_up', {
            room_id: roomState.room_id,
            tenant_id: roomState.tenant_id,
          });
        }
      }
    }

    return deletedCount;
  }

  /**
   * Recover room state on service restart
   */
  async recoverRoomStates(): Promise<RoomState[]> {
    const pattern = 'room:*';
    const keys = await this.redis.keys(pattern);
    
    const rooms: RoomState[] = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        const parsed = JSON.parse(data);
        parsed.metadata.created_at = new Date(parsed.metadata.created_at);
        parsed.metadata.last_activity = new Date(parsed.metadata.last_activity);
        parsed.members.forEach((m: RoomMember) => {
          m.joined_at = new Date(m.joined_at);
        });
        rooms.push(parsed);
      }
    }

    console.log(`[RoomStateManager] Recovered ${rooms.length} room states`);
    return rooms;
  }

  /**
   * Save room state to Redis
   */
  private async saveRoomState(roomState: RoomState): Promise<void> {
    const key = this.getRoomKey(roomState.room_id, roomState.tenant_id);
    const ttlSeconds = this.ttlHours * 60 * 60;
    await this.redis.setex(key, ttlSeconds, JSON.stringify(roomState));
  }

  /**
   * Get Redis key for room
   */
  private getRoomKey(roomId: string, tenantId: string): string {
    return `room:${tenantId}:${roomId}`;
  }
}
