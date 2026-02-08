
export class OffsetManager {
  // KafkaJS handles offsets automatically if autoCommit is true.
  // If manual, we use commitOffsets.
  
  constructor(private consumer: any) {}

  async commit(topic: string, partition: number, offset: string): Promise<void> {
    await this.consumer.commitOffsets([
      { topic, partition, offset: (BigInt(offset) + 1n).toString() }
    ]);
  }

  async seek(topic: string, partition: number, offset: string): Promise<void> {
    this.consumer.seek({ topic, partition, offset });
  }
}
