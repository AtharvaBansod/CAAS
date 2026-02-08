import { BaseConsumer } from './base-consumer';

export class ConsumerGroupManager {
  private consumers: Map<string, BaseConsumer<any>> = new Map();

  register(groupId: string, consumer: BaseConsumer<any>): void {
    this.consumers.set(groupId, consumer);
  }

  async startAll(): Promise<void> {
    const promises = Array.from(this.consumers.values()).map(c => c.start());
    await Promise.all(promises);
  }

  async stopAll(): Promise<void> {
    const promises = Array.from(this.consumers.values()).map(c => c.stop());
    await Promise.all(promises);
  }

  getConsumer(groupId: string): BaseConsumer<any> | undefined {
    return this.consumers.get(groupId);
  }
}
