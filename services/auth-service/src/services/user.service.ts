/**
 * User Service
 * Phase 4.5.0 - Task 05: Refactored to use UserRepository
 */

import { UserRepository } from '../repositories/user.repository';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUserProfile(user_id: string) {
    const user = await this.userRepository.findById(user_id);

    if (!user) {
      throw new Error('User not found');
    }

    // Remove sensitive data
    const { password_hash, mfa_secret, mfa_backup_codes, ...profile } = user;

    return profile;
  }

  async updateUserProfile(user_id: string, updates: any) {
    const user = await this.userRepository.updateUser(user_id, updates);

    if (!user) {
      throw new Error('User not found');
    }

    // Remove sensitive data
    const { password_hash, mfa_secret, mfa_backup_codes, ...profile } = user;

    return profile;
  }

  async updateLastLogin(user_id: string) {
    await this.userRepository.updateLastLogin(user_id);
  }

  async deleteUser(user_id: string) {
    await this.userRepository.deleteUser(user_id);
  }
}
