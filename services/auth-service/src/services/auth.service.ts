/**
 * Authentication Service
 * Phase 4.5.0 - Task 05: Using Repository Pattern
 */

import { UserRepository } from '../repositories/user.repository';

export interface User {
  user_id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  mfa_enabled: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async authenticateUser(email: string, password: string, tenant_id: string): Promise<User | null> {
    try {
      // Find user by email and tenant
      const user = await this.userRepository.findByEmail(email, tenant_id);
      
      if (!user) {
        return null;
      }

      // Verify password
      const isValid = await this.userRepository.verifyPassword(password, user.password_hash);
      
      if (!isValid) {
        return null;
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.user_id);

      return user as User;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  async getUserById(user_id: string): Promise<User> {
    const user = await this.userRepository.findById(user_id);

    if (!user) {
      throw new Error('User not found');
    }

    return user as User;
  }
}
