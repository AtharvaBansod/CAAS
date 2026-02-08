/**
 * Action Mapper
 * 
 * Maps HTTP methods and routes to authorization actions
 */

import { FastifyRequest } from 'fastify';

export class ActionMapper {
  private customMappings: Map<string, string>;

  constructor() {
    this.customMappings = new Map();
  }

  /**
   * Map HTTP method to action
   */
  map(request: FastifyRequest): string {
    const method = request.method;
    const path = request.url.split('?')[0];

    // Check for custom mappings first
    const customAction = this.getCustomMapping(path, method);
    if (customAction) {
      return customAction;
    }

    // Check for specific route patterns
    const specificAction = this.getSpecificAction(path, method);
    if (specificAction) {
      return specificAction;
    }

    // Default HTTP method mapping
    return this.getDefaultAction(method);
  }

  /**
   * Get custom mapping for route
   */
  private getCustomMapping(path: string, method: string): string | null {
    const key = `${method}:${path}`;
    return this.customMappings.get(key) || null;
  }

  /**
   * Get specific action for known patterns
   */
  private getSpecificAction(path: string, method: string): string | null {
    // Message actions
    if (path.includes('/messages')) {
      if (method === 'POST' && path.endsWith('/messages')) return 'message.send';
      if (method === 'POST' && path.includes('/react')) return 'message.react';
      if (method === 'POST' && path.includes('/pin')) return 'message.pin';
      if (method === 'POST' && path.includes('/forward')) return 'message.forward';
    }

    // Conversation actions
    if (path.includes('/conversations')) {
      if (method === 'POST' && path.includes('/members')) return 'conversation.add_member';
      if (method === 'DELETE' && path.includes('/members')) return 'conversation.remove_member';
      if (method === 'POST' && path.includes('/admin')) return 'conversation.set_admin';
    }

    // Group actions
    if (path.includes('/groups')) {
      if (method === 'POST' && path.endsWith('/join')) return 'group.join';
      if (method === 'POST' && path.endsWith('/leave')) return 'group.leave';
      if (method === 'POST' && path.includes('/invite')) return 'group.invite';
      if (method === 'POST' && path.includes('/kick')) return 'group.kick';
      if (method === 'POST' && path.includes('/ban')) return 'group.ban';
    }

    // User actions
    if (path.includes('/users')) {
      if (method === 'POST' && path.includes('/ban')) return 'user.ban';
      if (method === 'POST' && path.includes('/unban')) return 'user.unban';
      if (method === 'POST' && path.includes('/impersonate')) return 'user.impersonate';
    }

    // File actions
    if (path.includes('/files')) {
      if (method === 'POST') return 'file.upload';
      if (method === 'GET') return 'file.download';
      if (method === 'POST' && path.includes('/share')) return 'file.share';
    }

    return null;
  }

  /**
   * Get default action from HTTP method
   */
  private getDefaultAction(method: string): string {
    switch (method) {
      case 'GET':
      case 'HEAD':
        return 'read';
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return 'access';
    }
  }

  /**
   * Register custom action mapping
   */
  registerMapping(method: string, path: string, action: string): void {
    const key = `${method}:${path}`;
    this.customMappings.set(key, action);
  }

  /**
   * Register multiple mappings
   */
  registerMappings(mappings: Array<{ method: string; path: string; action: string }>): void {
    for (const mapping of mappings) {
      this.registerMapping(mapping.method, mapping.path, mapping.action);
    }
  }
}

export const actionMapper = new ActionMapper();
