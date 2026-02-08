import { Admin, ResourcePattern, AclOperation, AclPermissionType, AclResourceTypes } from 'kafkajs';

export class AclManager {
  constructor(private admin: Admin) {}

  async createProducerAcl(topic: string, principal: string): Promise<void> {
    await this.admin.createAcls({
      acl: [
        {
          resourcePatternType: ResourcePattern.LITERAL,
          resourceType: AclResourceTypes.TOPIC,
          resourceName: topic,
          principal,
          host: '*',
          operation: AclOperation.WRITE,
          permissionType: AclPermissionType.ALLOW,
        },
      ],
    });
  }

  async createConsumerAcl(topic: string, groupId: string, principal: string): Promise<void> {
    await this.admin.createAcls({
      acl: [
        {
          resourcePatternType: ResourcePattern.LITERAL,
          resourceType: AclResourceTypes.TOPIC,
          resourceName: topic,
          principal,
          host: '*',
          operation: AclOperation.READ,
          permissionType: AclPermissionType.ALLOW,
        },
        {
          resourcePatternType: ResourcePattern.LITERAL,
          resourceType: AclResourceTypes.GROUP,
          resourceName: groupId,
          principal,
          host: '*',
          operation: AclOperation.READ,
          permissionType: AclPermissionType.ALLOW,
        },
      ],
    });
  }

  async deleteAcls(topic: string, principal: string): Promise<void> {
    await this.admin.deleteAcls({
      filters: [
        {
          resourceName: topic,
          resourceType: AclResourceTypes.TOPIC,
          principal,
          permissionType: AclPermissionType.ALLOW,
          operation: AclOperation.ANY,
          resourcePatternType: ResourcePattern.ANY
        }
      ]
    });
  }
}
