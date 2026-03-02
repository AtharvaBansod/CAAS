export function getProjectScopedRoomName(
  tenantId: string,
  projectId: string,
  resourceType: string,
  resourceId: string
): string {
  return `tenant:${tenantId}:project:${projectId}:resource:${resourceType}:${resourceId}`;
}
