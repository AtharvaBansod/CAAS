import { getConnectionManager } from '../../connections';
import { v4 as uuidv4 } from 'uuid';

/**
 * Group Data Generator
 * Generates group data for a tenant
 */
export class GroupGenerator {
  private connection = getConnectionManager();

  /**
   * Generate groups for a tenant
   */
  async generate(tenantId: string, count: number, users: any[]) {
    const db = this.connection.getConnection();
    const groupsCollection = db.collection('groups');
    
    const groups = [];
    
    for (let i = 0; i < count; i++) {
      const creator = users[Math.floor(Math.random() * users.length)];
      const group = this.generateGroup(tenantId, creator, users);
      groups.push(group);
    }

    // Insert groups
    if (groups.length > 0) {
      await groupsCollection.insertMany(groups);
    }

    return groups;
  }

  /**
   * Generate a single group
   */
  private generateGroup(tenantId: string, creator: any, users: any[]) {
    const groupTypes = ['project', 'team', 'department', 'community', 'study', 'hobby'];
    const groupType = groupTypes[Math.floor(Math.random() * groupTypes.length)];
    
    const memberCount = Math.floor(Math.random() * 20) + 3; // 3-22 members
    const members = this.generateGroupMembers(users, creator, memberCount);
    
    return {
      _id: uuidv4(),
      tenantId,
      name: this.generateGroupName(groupType),
      description: this.generateGroupDescription(groupType),
      type: groupType,
      createdBy: creator._id,
      members,
      settings: {
        isPrivate: Math.random() > 0.7, // 30% private
        inviteOnly: Math.random() > 0.5, // 50% invite only
        requireApproval: Math.random() > 0.8, // 20% require approval
        allowInvites: Math.random() > 0.3, // 70% allow invites
        maxMembers: Math.random() > 0.5 ? Math.floor(Math.random() * 50) + 50 : null, // 50-100 or unlimited
      },
      metadata: {
        memberCount: members.length,
        messageCount: Math.floor(Math.random() * 1000) + 10,
        fileCount: Math.floor(Math.random() * 100) + 1,
        lastActivityAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      },
      tags: this.generateGroupTags(groupType),
      avatar: this.generateGroupAvatar(),
      banner: Math.random() > 0.7 ? this.generateGroupBanner() : null,
      status: 'active',
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * Generate group members
   */
  private generateGroupMembers(users: any[], creator: any, memberCount: number) {
    const members = [];
    const availableUsers = [...users];
    
    // Add creator as admin
    members.push({
      userId: creator._id,
      role: 'admin',
      joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      invitedBy: creator._id,
      status: 'active',
    });
    
    // Remove creator from available users
    const creatorIndex = availableUsers.findIndex(u => u._id === creator._id);
    if (creatorIndex > -1) {
      availableUsers.splice(creatorIndex, 1);
    }
    
    // Add other members
    for (let i = 1; i < memberCount && availableUsers.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableUsers.length);
      const user = availableUsers[randomIndex];
      availableUsers.splice(randomIndex, 1);
      
      const roles = ['member', 'moderator'];
      const role = i <= 2 && Math.random() > 0.5 ? 'moderator' : 'member'; // First few members might be moderators
      
      members.push({
        userId: user._id,
        role,
        joinedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        invitedBy: creator._id,
        status: 'active',
      });
    }
    
    return members;
  }

  /**
   * Generate group name based on type
   */
  private generateGroupName(type: string): string {
    const names = {
      project: [
        'Project Alpha',
        'Project Beta',
        'Product Development',
        'Engineering Team',
        'Design Sprint',
        'Research Initiative',
        'Innovation Lab',
        'Development Squad',
      ],
      team: [
        'Marketing Team',
        'Sales Squad',
        'Support Heroes',
        'DevOps Team',
        'QA Warriors',
        'Data Science Team',
        'Product Team',
        'Leadership Council',
      ],
      department: [
        'Engineering Department',
        'Marketing Department',
        'Sales Department',
        'HR Department',
        'Finance Department',
        'Operations Department',
        'Legal Department',
        'Customer Success',
      ],
      community: [
        'Tech Enthusiasts',
        'Design Community',
        'Startup Founders',
        'Developer Network',
        'Innovation Hub',
        'Creative Minds',
        'Business Leaders',
        'Industry Professionals',
      ],
      study: [
        'Study Group A',
        'Research Team',
        'Learning Circle',
        'Knowledge Sharing',
        'Book Club',
        'Skill Development',
        'Certification Prep',
        'Academic Research',
      ],
      hobby: [
        'Photography Club',
        'Music Lovers',
        'Gaming Community',
        'Sports Fans',
        'Art & Design',
        'Food & Cooking',
        'Travel Enthusiasts',
        'Fitness Group',
      ],
    };
    
    const typeNames = names[type as keyof typeof names] || names.project;
    return typeNames[Math.floor(Math.random() * typeNames.length)];
  }

  /**
   * Generate group description based on type
   */
  private generateGroupDescription(type: string): string {
    const descriptions = {
      project: [
        'Working together to deliver amazing products and solutions.',
        'Collaborative space for project planning and execution.',
        'Innovative team building the future of technology.',
        'Dedicated to excellence in product development.',
      ],
      team: [
        'Supporting each other to achieve team goals.',
        'Collaboration and communication hub for our team.',
        'Working together towards common objectives.',
        'Team space for sharing ideas and updates.',
      ],
      department: [
        'Department-wide communication and collaboration.',
        'Official space for departmental updates and discussions.',
        'Coordinating efforts across the department.',
        'Department resource sharing and planning.',
      ],
      community: [
        'Connecting professionals and enthusiasts in our field.',
        'Sharing knowledge and experiences with the community.',
        'Building a network of like-minded individuals.',
        'Community space for discussion and support.',
      ],
      study: [
        'Collaborative learning and knowledge sharing.',
        'Study group for academic and professional development.',
        'Working together to achieve learning goals.',
        'Supportive environment for educational growth.',
      ],
      hobby: [
        'Sharing our passion and connecting with others.',
        'Community space for hobby enthusiasts.',
        'Celebrating our shared interests and activities.',
        'Connecting people through common hobbies.',
      ],
    };
    
    const typeDescriptions = descriptions[type as keyof typeof descriptions] || descriptions.project;
    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
  }

  /**
   * Generate group tags based on type
   */
  private generateGroupTags(type: string): string[] {
    const allTags = {
      project: ['development', 'product', 'engineering', 'design', 'innovation'],
      team: ['collaboration', 'teamwork', 'communication', 'goals', 'support'],
      department: ['official', 'department', 'organization', 'coordination', 'planning'],
      community: ['networking', 'professional', 'sharing', 'discussion', 'support'],
      study: ['learning', 'education', 'knowledge', 'collaborative', 'growth'],
      hobby: ['interest', 'passion', 'community', 'sharing', 'fun'],
    };
    
    const typeTags = allTags[type as keyof typeof allTags] || allTags.project;
    const tagCount = Math.floor(Math.random() * 3) + 1; // 1-3 tags
    
    return typeTags.slice(0, tagCount);
  }

  /**
   * Generate group avatar
   */
  private generateGroupAvatar(): string {
    const avatarId = Math.floor(Math.random() * 1000);
    return `https://api.dicebear.com/7.x/identicon/svg?seed=group_${avatarId}`;
  }

  /**
   * Generate group banner
   */
  private generateGroupBanner(): string {
    const bannerId = Math.floor(Math.random() * 1000);
    return `https://picsum.photos/seed/banner_${bannerId}/1200/400.jpg`;
  }
}
