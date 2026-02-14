import { Client } from '@elastic/elasticsearch';
import { User } from '../types';

export class UserIndexer {
  constructor(private esClient: Client) {}

  async indexUser(user: User): Promise<void> {
    try {
      await this.esClient.index({
        index: 'users',
        id: user.id,
        document: {
          id: user.id,
          tenant_id: user.tenant_id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
        },
      });
      console.log(`Indexed user: ${user.id}`);
    } catch (error) {
      console.error(`Failed to index user ${user.id}:`, error);
      throw error;
    }
  }

  async updateUser(user: User): Promise<void> {
    try {
      await this.esClient.update({
        index: 'users',
        id: user.id,
        doc: {
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
        },
      });
      console.log(`Updated user: ${user.id}`);
    } catch (error) {
      console.error(`Failed to update user ${user.id}:`, error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.esClient.delete({
        index: 'users',
        id: userId,
      });
      console.log(`Deleted user: ${userId}`);
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
      throw error;
    }
  }

  async bulkIndex(users: User[]): Promise<void> {
    if (users.length === 0) return;

    const operations = users.flatMap((user) => [
      { index: { _index: 'users', _id: user.id } },
      {
        id: user.id,
        tenant_id: user.tenant_id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      },
    ]);

    try {
      const result = await this.esClient.bulk({ operations });
      if (result.errors) {
        console.error('Bulk indexing had errors:', result.items);
      } else {
        console.log(`Bulk indexed ${users.length} users`);
      }
    } catch (error) {
      console.error('Failed to bulk index users:', error);
      throw error;
    }
  }
}
