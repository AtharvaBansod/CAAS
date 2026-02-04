import { getConnectionManager } from '../../connections';
import { v4 as uuidv4 } from 'uuid';

/**
 * Conversation Data Generator
 * Generates conversations and user relationships
 */
export class ConversationGenerator {
  private connection = getConnectionManager();

  /**
   * Generate conversations for a tenant
   */
  async generate(tenantId: string, conversationsPerUser: number, users: any[], groups: any[]) {
    const db = this.connection.getConnection();
    const conversationsCollection = db.collection('conversations');
    const relationshipsCollection = db.collection('user_relationships');
    
    const conversations = [];
    const relationships = [];
    
    // Generate user relationships (friends, blocks)
    await this.generateUserRelationships(users, relationships);
    
    // Generate direct messages (DMs)
    const dmCount = Math.floor(conversationsPerUser * 0.6); // 60% DMs
    for (let i = 0; i < dmCount; i++) {
      const user1 = users[Math.floor(Math.random() * users.length)];
      const user2 = users[Math.floor(Math.random() * users.length)];
      
      if (user1._id !== user2._id) {
        const conversation = this.generateDirectMessage(tenantId, user1, user2);
        conversations.push(conversation);
      }
    }
    
    // Generate group conversations
    const groupConvCount = Math.floor(conversationsPerUser * 0.4); // 40% groups
    for (let i = 0; i < groupConvCount && i < groups.length; i++) {
      const group = groups[i];
      const conversation = this.generateGroupConversation(tenantId, group);
      conversations.push(conversation);
    }

    // Insert conversations
    if (conversations.length > 0) {
      await conversationsCollection.insertMany(conversations);
    }
    
    // Insert relationships
    if (relationships.length > 0) {
      await relationshipsCollection.insertMany(relationships);
    }

    return conversations;
  }

  /**
   * Generate user relationships
   */
  private async generateUserRelationships(users: any[], relationships: any[]) {
    // Generate friendships
    for (let i = 0; i < users.length; i++) {
      const user1 = users[i];
      const friendCount = Math.floor(Math.random() * 5) + 1; // 1-5 friends per user
      
      for (let j = 0; j < friendCount; j++) {
        const randomIndex = Math.floor(Math.random() * users.length);
        const user2 = users[randomIndex];
        
        if (user1._id !== user2._id) {
          // Check if relationship already exists
          const exists = relationships.some(r => 
            (r.userId === user1._id && r.relatedUserId === user2._id) ||
            (r.userId === user2._id && r.relatedUserId === user1._id)
          );
          
          if (!exists) {
            const relationship = {
              _id: uuidv4(),
              userId: user1._id,
              relatedUserId: user2._id,
              type: 'friend',
              status: 'active',
              initiatedBy: user1._id,
              createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(),
            };
            
            relationships.push(relationship);
          }
        }
      }
    }
    
    // Generate some blocks
    const blockCount = Math.floor(users.length * 0.05); // 5% of users block someone
    for (let i = 0; i < blockCount; i++) {
      const user1 = users[Math.floor(Math.random() * users.length)];
      const user2 = users[Math.floor(Math.random() * users.length)];
      
      if (user1._id !== user2._id) {
        const relationship = {
          _id: uuidv4(),
          userId: user1._id,
          relatedUserId: user2._id,
          type: 'block',
          status: 'active',
          initiatedBy: user1._id,
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        };
        
        relationships.push(relationship);
      }
    }
  }

  /**
   * Generate direct message conversation
   */
  private generateDirectMessage(tenantId: string, user1: any, user2: any) {
    return {
      _id: uuidv4(),
      tenantId,
      type: 'direct',
      participants: [
        {
          userId: user1._id,
          role: 'participant',
          joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          lastReadAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        },
        {
          userId: user2._id,
          role: 'participant',
          joinedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          lastReadAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        },
      ],
      settings: {
        name: null, // DMs don't have names
        description: null,
        isArchived: false,
        isPinned: false,
        muteNotifications: false,
      },
      metadata: {
        messageCount: Math.floor(Math.random() * 100) + 1,
        lastMessageAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        lastMessagePreview: this.generateMessagePreview(),
      },
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Generate group conversation
   */
  private generateGroupConversation(tenantId: string, group: any) {
    const participantCount = Math.floor(Math.random() * 10) + 3; // 3-12 participants
    const participants = [];
    
    // Add group admin
    participants.push({
      userId: group.createdBy,
      role: 'admin',
      joinedAt: group.createdAt,
      lastReadAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    });
    
    // Add other members
    for (let i = 1; i < participantCount; i++) {
      participants.push({
        userId: uuidv4(), // Would be actual user IDs in real implementation
        role: Math.random() > 0.8 ? 'moderator' : 'participant',
        joinedAt: new Date(group.createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        lastReadAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      });
    }

    return {
      _id: uuidv4(),
      tenantId,
      type: 'group',
      groupId: group._id,
      participants,
      settings: {
        name: group.name,
        description: group.description,
        isArchived: false,
        isPinned: false,
        muteNotifications: false,
      },
      metadata: {
        messageCount: Math.floor(Math.random() * 500) + 10,
        lastMessageAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        lastMessagePreview: this.generateMessagePreview(),
      },
      createdAt: group.createdAt,
      updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Generate message preview
   */
  private generateMessagePreview(): string {
    const previews = [
      'Hey, how are you?',
      'Sure, let me check that',
      'Thanks for the update!',
      'Can we schedule a call?',
      'Great work on this!',
      'I\'ll review it shortly',
      'Meeting at 3pm?',
      'Sounds good to me',
      'Let me know if you need anything',
      'Have a great weekend!',
    ];
    
    return previews[Math.floor(Math.random() * previews.length)];
  }
}
