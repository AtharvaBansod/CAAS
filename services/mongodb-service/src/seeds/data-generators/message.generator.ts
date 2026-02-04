import { getConnectionManager } from '../../connections';
import { v4 as uuidv4 } from 'uuid';

/**
 * Message Data Generator
 * Generates messages for conversations
 */
export class MessageGenerator {
  private connection = getConnectionManager();

  /**
   * Generate messages for conversations
   */
  async generate(conversations: any[], messagesPerConversation: number, users: any[]) {
    const db = this.connection.getConnection();
    const messagesCollection = db.collection('messages');
    
    const messages = [];
    
    for (const conversation of conversations) {
      const messageCount = Math.floor(Math.random() * messagesPerConversation) + 1;
      const conversationMessages = this.generateConversationMessages(
        conversation,
        messageCount,
        users
      );
      
      messages.push(...conversationMessages);
    }

    // Insert messages in batches
    if (messages.length > 0) {
      await messagesCollection.insertMany(messages);
    }

    return messages;
  }

  /**
   * Generate messages for a single conversation
   */
  private generateConversationMessages(conversation: any, messageCount: number, users: any[]) {
    const messages = [];
    const participantIds = conversation.participants.map((p: any) => p.userId);
    
    let lastMessageTime = conversation.createdAt;
    
    for (let i = 0; i < messageCount; i++) {
      const senderId = participantIds[Math.floor(Math.random() * participantIds.length)];
      const sender = users.find((u: any) => u._id === senderId);
      
      if (!sender) continue;
      
      // Generate message timestamp with realistic gaps
      const timeGap = Math.random() * 3600000; // 0-1 hour gap
      lastMessageTime = new Date(lastMessageTime.getTime() + timeGap);
      
      const message = {
        _id: uuidv4(),
        tenantId: conversation.tenantId,
        conversationId: conversation._id,
        senderId,
        type: this.getRandomMessageType(),
        content: this.generateMessageContent(),
        metadata: {
          edited: Math.random() > 0.9, // 10% chance of being edited
          editedAt: Math.random() > 0.9 ? new Date(lastMessageTime.getTime() + 60000) : null,
          reactions: this.generateReactions(participantIds),
          replyTo: Math.random() > 0.8 ? messages[Math.floor(Math.random() * messages.length)]?._id : null,
          forwarded: Math.random() > 0.95,
          priority: Math.random() > 0.95 ? 'high' : 'normal',
        },
        status: 'delivered',
        readBy: this.generateReadBy(participantIds, senderId, lastMessageTime),
        createdAt: lastMessageTime,
        updatedAt: lastMessageTime,
      };
      
      messages.push(message);
    }
    
    return messages;
  }

  /**
   * Get random message type
   */
  private getRandomMessageType(): string {
    const types = ['text', 'image', 'file', 'system'];
    const weights = [0.8, 0.1, 0.05, 0.05]; // 80% text, 10% image, 5% file, 5% system
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return types[i];
      }
    }
    
    return 'text';
  }

  /**
   * Generate message content based on type
   */
  private generateMessageContent(): any {
    const type = this.getRandomMessageType();
    
    switch (type) {
      case 'text':
        return this.generateTextContent();
      case 'image':
        return this.generateImageContent();
      case 'file':
        return this.generateFileContent();
      case 'system':
        return this.generateSystemContent();
      default:
        return this.generateTextContent();
    }
  }

  /**
   * Generate text message content
   */
  private generateTextContent() {
    const messages = [
      'Hey, how are you doing?',
      'Great! Thanks for asking. How about you?',
      'I\'m doing well, thanks!',
      'Did you see the latest updates?',
      'Yes, they look amazing!',
      'When can we schedule a meeting?',
      'How about tomorrow at 3pm?',
      'Perfect! I\'ll send an invite.',
      'Looking forward to it!',
      'Have you reviewed the proposal?',
      'I\'ll get to it today.',
      'Thanks for your patience!',
      'No problem at all!',
      'Let me know if you need anything.',
      'Sure thing!',
      'Great work on this project!',
      'Appreciate the kind words!',
      'Team effort all the way!',
      'Absolutely! 🎉',
      'Have a great weekend!',
      'You too! 😊',
    ];
    
    return {
      text: messages[Math.floor(Math.random() * messages.length)],
      mentions: this.generateMentions(),
      hashtags: this.generateHashtags(),
      links: this.generateLinks(),
    };
  }

  /**
   * Generate image message content
   */
  private generateImageContent() {
    return {
      url: `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/800/600.jpg`,
      thumbnailUrl: `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/200/150.jpg`,
      width: 800,
      height: 600,
      size: Math.floor(Math.random() * 1000000) + 100000, // 100KB-1.1MB
      format: 'jpg',
      alt: 'Shared image',
    };
  }

  /**
   * Generate file message content
   */
  private generateFileContent() {
    const fileTypes = [
      { name: 'document.pdf', type: 'application/pdf', size: 2048576 },
      { name: 'presentation.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', size: 5242880 },
      { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 1048576 },
      { name: 'archive.zip', type: 'application/zip', size: 10485760 },
      { name: 'image.png', type: 'image/png', size: 524288 },
    ];
    
    const file = fileTypes[Math.floor(Math.random() * fileTypes.length)];
    
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      url: `https://example.com/files/${Math.random().toString(36).substring(7)}/${file.name}`,
      thumbnailUrl: file.type.startsWith('image/') ? `https://picsum.photos/seed/${Math.random().toString(36).substring(7)}/200/150.jpg` : null,
    };
  }

  /**
   * Generate system message content
   */
  private generateSystemContent() {
    const systemMessages = [
      { type: 'user_joined', content: 'User joined the conversation' },
      { type: 'user_left', content: 'User left the conversation' },
      { type: 'conversation_created', content: 'Conversation was created' },
      { type: 'name_changed', content: 'Conversation name was changed' },
      { type: 'user_added', content: 'User was added to the conversation' },
      { type: 'user_removed', content: 'User was removed from the conversation' },
    ];
    
    return systemMessages[Math.floor(Math.random() * systemMessages.length)];
  }

  /**
   * Generate mentions
   */
  private generateMentions(): any[] {
    if (Math.random() > 0.3) return []; // 70% chance of no mentions
    
    const mentionCount = Math.floor(Math.random() * 3) + 1; // 1-3 mentions
    const mentions = [];
    
    for (let i = 0; i < mentionCount; i++) {
      mentions.push({
        userId: uuidv4(),
        username: `user_${Math.floor(Math.random() * 1000)}`,
        displayName: `User ${Math.floor(Math.random() * 1000)}`,
      });
    }
    
    return mentions;
  }

  /**
   * Generate hashtags
   */
  private generateHashtags(): string[] {
    if (Math.random() > 0.2) return []; // 80% chance of no hashtags
    
    const hashtags = [
      '#important', '#urgent', '#review', '#meeting', '#deadline',
      '#project', '#update', '#announcement', '#question', '#idea',
    ];
    
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 hashtags
    return hashtags.slice(0, count);
  }

  /**
   * Generate links
   */
  private generateLinks(): any[] {
    if (Math.random() > 0.3) return []; // 70% chance of no links
    
    const links = [
      { url: 'https://example.com/project', title: 'Project Overview' },
      { url: 'https://docs.example.com', title: 'Documentation' },
      { url: 'https://github.com/example/repo', title: 'GitHub Repository' },
    ];
    
    return [links[Math.floor(Math.random() * links.length)]];
  }

  /**
   * Generate reactions
   */
  private generateReactions(participantIds: string[]): any[] {
    if (Math.random() > 0.4) return []; // 60% chance of no reactions
    
    const reactions = [];
    const reactionCount = Math.floor(Math.random() * 5) + 1; // 1-5 reactions
    
    for (let i = 0; i < reactionCount && i < participantIds.length; i++) {
      const emojis = ['👍', '❤️', '😂', '🎉', '🔥', '💯', '👏', '🙌'];
      const userId = participantIds[Math.floor(Math.random() * participantIds.length)];
      
      reactions.push({
        userId,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        createdAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      });
    }
    
    return reactions;
  }

  /**
   * Generate read receipts
   */
  private generateReadBy(participantIds: string[], senderId: string, messageTime: Date): any[] {
    const readBy = [];
    
    for (const participantId of participantIds) {
      if (participantId === senderId) continue; // Sender doesn't need to read their own message
      
      // 80% chance that a participant has read the message
      if (Math.random() > 0.2) {
        readBy.push({
          userId: participantId,
          readAt: new Date(messageTime.getTime() + Math.random() * 3600000), // Read within 1 hour
        });
      }
    }
    
    return readBy;
  }
}
