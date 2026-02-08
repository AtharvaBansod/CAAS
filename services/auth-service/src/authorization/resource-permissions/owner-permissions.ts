/**
 * Owner Permissions
 * 
 * Implicit permissions for resource owners
 */

export const OWNER_PERMISSIONS: Record<string, string[]> = {
  message: ['message.read', 'message.update', 'message.delete'],
  conversation: ['conversation.read', 'conversation.update', 'conversation.delete', 'conversation.add_member', 'conversation.remove_member'],
  group: ['group.read', 'group.update', 'group.delete', 'group.invite', 'group.kick'],
  file: ['file.download', 'file.delete', 'file.share'],
};

export function getOwnerPermissions(resourceType: string): string[] {
  return OWNER_PERMISSIONS[resourceType] || [];
}
