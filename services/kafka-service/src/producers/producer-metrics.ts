export class ProducerMetrics {
  private metrics: Map<string, {
    sentCount: number;
    errorCount: number;
    totalLatency: number;
    batchCount: number;
  }> = new Map();

  recordSend(topic: string, latency: number): void {
    const topicMetrics = this.getTopicMetrics(topic);
    topicMetrics.sentCount++;
    topicMetrics.totalLatency += latency;
  }

  recordBatchSend(topic: string, count: number, latency: number): void {
    const topicMetrics = this.getTopicMetrics(topic);
    topicMetrics.sentCount += count;
    topicMetrics.batchCount++;
    topicMetrics.totalLatency += latency;
  }

  recordError(topic: string): void {
    const topicMetrics = this.getTopicMetrics(topic);
    topicMetrics.errorCount++;
  }

  private getTopicMetrics(topic: string) {
    if (!this.metrics.has(topic)) {
      this.metrics.set(topic, {
        sentCount: 0,
        errorCount: 0,
        totalLatency: 0,
        batchCount: 0
      });
    }
    return this.metrics.get(topic)!;
  }

  getMetrics() {
    const result: Record<string, any> = {};
    this.metrics.forEach((value, key) => {
      result[key] = {
        ...value,
        avgLatency: value.sentCount > 0 ? value.totalLatency / value.sentCount : 0
      };
    });
    return result;
  }
}
