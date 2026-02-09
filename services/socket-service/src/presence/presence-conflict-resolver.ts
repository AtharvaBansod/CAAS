import { RedisClientType } from 'redis';
import { PresenceState } from './presence-states';
import { getLogger } from '../utils/logger';

const logger = getLogger('PresenceConflictResolver');

/**
 * Vector clock for distributed state resolution
 */
export interface VectorClock {
    [nodeId: string]: number;
}

export interface PresenceUpdate {
    user_id: string;
    status: PresenceState;
    timestamp: Date;
    vector_clock: VectorClock;
    node_id: string;
}

export class PresenceConflictResolver {
    constructor(private redis: RedisClientType, private nodeId: string) { }

    /**
     * Compare two vector clocks
     * Returns: 'before' | 'after' | 'concurrent'
     */
    private compareVectorClocks(a: VectorClock, b: VectorClock): 'before' | 'after' | 'concurrent' {
        let aIsGreater = false;
        let bIsGreater = false;

        // Get all node IDs from both clocks
        const allNodes = new Set([...Object.keys(a), ...Object.keys(b)]);

        for (const nodeId of allNodes) {
            const aValue = a[nodeId] || 0;
            const bValue = b[nodeId] || 0;

            if (aValue > bValue) {
                aIsGreater = true;
            } else if (bValue > aValue) {
                bIsGreater = true;
            }
        }

        if (aIsGreater && !bIsGreater) return 'after';
        if (bIsGreater && !aIsGreater) return 'before';
        return 'concurrent';
    }

    /**
     * Resolve conflict between two presence updates
     */
    resolveConflict(update1: PresenceUpdate, update2: PresenceUpdate): PresenceUpdate {
        const comparison = this.compareVectorClocks(update1.vector_clock, update2.vector_clock);

        if (comparison === 'after') {
            // update1 is newer
            return update1;
        } else if (comparison === 'before') {
            // update2 is newer
            return update2;
        } else {
            // Concurrent updates - use tie-breaking rules

            // Rule 1: Prefer active states over inactive
            const activeStates: PresenceState[] = ['online', 'away', 'busy'];
            const update1IsActive = activeStates.includes(update1.status);
            const update2IsActive = activeStates.includes(update2.status);

            if (update1IsActive && !update2IsActive) {
                return update1;
            } else if (update2IsActive && !update1IsActive) {
                return update2;
            }

            // Rule 2: Use timestamp as fallback
            if (update1.timestamp > update2.timestamp) {
                return update1;
            } else if (update2.timestamp > update1.timestamp) {
                return update2;
            }

            // Rule 3: Use node ID as final tie-breaker (deterministic)
            return update1.node_id > update2.node_id ? update1 : update2;
        }
    }

    /**
     * Increment vector clock for this node
     */
    async incrementVectorClock(userId: string): Promise<VectorClock> {
        const key = `presence:vector:${userId}`;

        try {
            // Increment this node's counter
            await this.redis.hIncrBy(key, this.nodeId, 1);

            // Get full vector clock
            const clockData = await this.redis.hGetAll(key);
            const vectorClock: VectorClock = {};

            for (const [nodeId, value] of Object.entries(clockData)) {
                vectorClock[nodeId] = parseInt(value, 10);
            }

            return vectorClock;
        } catch (error: any) {
            logger.error(`Failed to increment vector clock for ${userId}`, error);
            return { [this.nodeId]: 1 };
        }
    }

    /**
     * Apply presence update with conflict resolution
     */
    async applyUpdate(update: PresenceUpdate): Promise<boolean> {
        const key = `presence:state:${update.user_id}`;

        try {
            // Get current state
            const currentData = await this.redis.get(key);

            if (!currentData) {
                // No current state, apply update
                await this.redis.set(key, JSON.stringify(update), {
                    EX: 24 * 60 * 60,
                });
                return true;
            }

            const currentUpdate: PresenceUpdate = JSON.parse(currentData);

            // Resolve conflict
            const resolved = this.resolveConflict(currentUpdate, update);

            // Only update if the new update wins
            if (resolved.timestamp === update.timestamp && resolved.node_id === update.node_id) {
                await this.redis.set(key, JSON.stringify(update), {
                    EX: 24 * 60 * 60,
                });
                return true;
            }

            return false;
        } catch (error: any) {
            logger.error(`Failed to apply presence update for ${update.user_id}`, error);
            return false;
        }
    }
}
