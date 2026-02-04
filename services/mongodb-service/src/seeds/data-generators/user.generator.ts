import { getConnectionManager } from '../../connections';
import { v4 as uuidv4 } from 'uuid';

/**
 * User Data Generator
 * Generates users for a specific tenant
 */
export class UserGenerator {
  private connection = getConnectionManager();

  /**
   * Generate users for a tenant
   */
  async generate(tenantId: string, count: number) {
    const db = this.connection.getConnection();
    const usersCollection = db.collection('users');
    
    const users = [];
    
    for (let i = 0; i < count; i++) {
      const user = {
        _id: uuidv4(),
        tenantId,
        externalId: `user_${tenantId}_${i + 1}`,
        email: this.generateEmail(i),
        username: this.generateUsername(i),
        displayName: this.generateDisplayName(i),
        avatar: this.generateAvatarUrl(),
        profile: {
          firstName: this.generateFirstName(),
          lastName: this.generateLastName(),
          bio: this.generateBio(),
          location: this.generateLocation(),
          timezone: 'UTC',
          language: 'en',
        },
        settings: {
          notifications: {
            email: true,
            push: true,
            inApp: true,
          },
          privacy: {
            showOnlineStatus: true,
            allowDirectMessages: true,
            profileVisibility: 'public',
          },
          chat: {
            soundEnabled: true,
            enterToSend: false,
            showTimestamps: true,
          },
        },
        status: this.getRandomStatus(),
        lastSeenAt: this.generateLastSeen(),
        createdAt: this.generateCreatedAt(),
        updatedAt: new Date(),
      };
      
      users.push(user);
    }

    await usersCollection.insertMany(users);
    return users;
  }

  /**
   * Generate email address
   */
  private generateEmail(index: number): string {
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'example.com'];
    const firstNames = ['john', 'jane', 'mike', 'sarah', 'david', 'emily', 'chris', 'lisa'];
    const lastNames = ['smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis'];
    
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    const domain = domains[index % domains.length];
    
    return `${firstName}.${lastName}${index}@${domain}`;
  }

  /**
   * Generate username
   */
  private generateUsername(index: number): string {
    const adjectives = ['cool', 'smart', 'happy', 'brave', 'quick', 'calm', 'bold', 'keen'];
    const nouns = ['coder', 'designer', 'builder', 'thinker', 'creator', 'maker', 'dreamer', 'leader'];
    
    const adjective = adjectives[index % adjectives.length];
    const noun = nouns[Math.floor(index / adjectives.length) % nouns.length];
    
    return `${adjective}_${noun}_${index + 1}`;
  }

  /**
   * Generate display name
   */
  private generateDisplayName(index: number): string {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[Math.floor(index / firstNames.length) % lastNames.length];
    
    return `${firstName} ${lastName}`;
  }

  /**
   * Generate avatar URL
   */
  private generateAvatarUrl(): string {
    const avatarId = Math.floor(Math.random() * 1000);
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarId}`;
  }

  /**
   * Generate first name
   */
  private generateFirstName(): string {
    const names = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa', 'Tom', 'Anna'];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Generate last name
   */
  private generateLastName(): string {
    const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Wilson', 'Moore'];
    return names[Math.floor(Math.random() * names.length)];
  }

  /**
   * Generate bio
   */
  private generateBio(): string {
    const bios = [
      'Passionate developer and tech enthusiast',
      'Love building amazing products',
      'Coffee addict and code ninja',
      'Making the world a better place',
      'Always learning, always growing',
      'Creative problem solver',
      'Full-stack developer',
      'UI/UX enthusiast',
      'Data-driven decision maker',
      'Team player and leader',
    ];
    
    return bios[Math.floor(Math.random() * bios.length)];
  }

  /**
   * Generate location
   */
  private generateLocation(): string {
    const locations = [
      'San Francisco, CA',
      'New York, NY',
      'London, UK',
      'Berlin, Germany',
      'Tokyo, Japan',
      'Sydney, Australia',
      'Toronto, Canada',
      'Paris, France',
      'Amsterdam, Netherlands',
      'Singapore',
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
  }

  /**
   * Get random user status
   */
  private getRandomStatus(): string {
    const statuses = ['active', 'away', 'busy', 'offline'];
    const weights = [0.6, 0.2, 0.1, 0.1]; // Probability weights
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return statuses[i];
      }
    }
    
    return 'offline';
  }

  /**
   * Generate last seen timestamp
   */
  private generateLastSeen(): Date {
    const now = new Date();
    const hoursAgo = Math.floor(Math.random() * 72); // 0-72 hours ago
    
    return new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
  }

  /**
   * Generate created at timestamp
   */
  private generateCreatedAt(): Date {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 365); // 0-365 days ago
    
    return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  }
}
