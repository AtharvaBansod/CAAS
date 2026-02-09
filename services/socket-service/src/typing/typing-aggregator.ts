import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('TypingAggregator');

export interface TypingUser {
    user_id: string;
    display_name: string;
    started_at: Date;
}

export interface AggregatedTypingStatus {
    conversation_id: string;
    typing_users: TypingUser[];
    display_text: string;
    count: number;
}

export class TypingAggregator {
    constructor(private redis: RedisClientType) { }

    /**
     * Get aggregated typing status for a conversation
     */
    async getAggregatedStatus(conversationId: string, excludeUserId?: string): Promise<AggregatedTypingStatus> {
        try {
            const key = `typing:${conversationId}`;
            const typingData = await this.redis.hGetAll(key);

            const typingUsers: TypingUser[] = [];

            for (const [userId, data] of Object.entries(typingData)) {
                // Exclude the requesting user
                if (excludeUserId && userId === excludeUserId) {
                    continue;
                }

                try {
                    const parsed = JSON.parse(data);
                    typingUsers.push({
                        user_id: userId,
                        display_name: parsed.display_name || 'User',
                        started_at: new Date(parsed.started_at),
                    });
                } catch {
                    // Skip invalid entries
                }
            }

            const displayText = this.formatTypingText(typingUsers);

            return {
                conversation_id: conversationId,
                typing_users: typingUsers,
                display_text: displayText,
                count: typingUsers.length,
            };
        } catch (error: any) {
            logger.error(`Failed to get aggregated typing status for ${conversationId}`, error);
            return {
                conversation_id: conversationId,
                typing_users: [],
                display_text: '',
                count: 0,
            };
        }
    }

    /**
     * Format typing text based on number of users
     * Examples:
     * - "Alice is typing..."
     * - "Alice and Bob are typing..."
     * - "Alice, Bob and 2 others are typing..."
     */
    private formatTypingText(users: TypingUser[]): string {
        if (users.length === 0) {
            return '';
        }

        if (users.length === 1) {
            return `${users[0].display_name} is typing...`;
        }

        if (users.length === 2) {
            return `${users[0].display_name} and ${users[1].display_name} are typing...`;
        }

        if (users.length === 3) {
            return `${users[0].display_name}, ${users[1].display_name} and ${users[2].display_name} are typing...`;
        }

        // More than 3 users
        const othersCount = users.length - 2;
        return `${users[0].display_name}, ${users[1].display_name} and ${othersCount} ${othersCount === 1 ? 'other' : 'others'} are typing...`;
    }

    /**
     * Get typing status with custom formatting
     */
    async getTypingStatusWithFormat(
        conversationId: string,
        excludeUserId?: string,
        maxDisplay: number = 2
    ): Promise<AggregatedTypingStatus> {
        const status = await this.getAggregatedStatus(conversationId, excludeUserId);

        if (status.typing_users.length > maxDisplay) {
            const displayedUsers = status.typing_users.slice(0, maxDisplay);
            const othersCount = status.typing_users.length - maxDisplay;

            let text = displayedUsers.map(u => u.display_name).join(', ');
            text += ` and ${othersCount} ${othersCount === 1 ? 'other' : 'others'} are typing...`;

            return {
                ...status,
                display_text: text,
            };
        }

        return status;
    }

    /**
     * Get simple count-based text
     */
    getSimpleTypingText(count: number): string {
        if (count === 0) return '';
        if (count === 1) return 'Someone is typing...';
        return `${count} people are typing...`;
    }
}
