import { Admin, Consumer } from 'kafkajs';

export class LagMonitor {
  constructor(private admin: Admin) {}

  async getConsumerGroupLag(groupId: string): Promise<Record<string, number>> {
    const offsets = await this.admin.fetchOffsets({ groupId });
    // This is a simplified implementation. Real lag calculation requires fetching topic end offsets too.
    // For now we just return the committed offsets.
    const result: Record<string, number> = {};
    offsets.forEach(o => {
      result[`${o.topic}-${o.partition}`] = parseInt(o.offset, 10);
    });
    return result;
  }
}
