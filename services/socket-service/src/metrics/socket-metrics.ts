import { getLogger } from '../utils/logger';

const logger = getLogger('SocketMetrics');

interface MetricData {
  count: number;
  lastUpdated: Date;
}

export class SocketMetrics {
  private connections: number = 0;
  private messagesSent: Map<string, MetricData> = new Map();
  private messagesReceived: Map<string, MetricData> = new Map();
  private eventLatencies: Map<string, number[]> = new Map();

  incrementConnections(): void {
    this.connections++;
  }

  decrementConnections(): void {
    this.connections = Math.max(0, this.connections - 1);
  }

  getConnectionCount(): number {
    return this.connections;
  }

  recordMessageSent(namespace: string, event: string): void {
    const key = `${namespace}:${event}`;
    const existing = this.messagesSent.get(key);

    if (existing) {
      existing.count++;
      existing.lastUpdated = new Date();
    } else {
      this.messagesSent.set(key, { count: 1, lastUpdated: new Date() });
    }
  }

  recordMessageReceived(namespace: string, event: string): void {
    const key = `${namespace}:${event}`;
    const existing = this.messagesReceived.get(key);

    if (existing) {
      existing.count++;
      existing.lastUpdated = new Date();
    } else {
      this.messagesReceived.set(key, { count: 1, lastUpdated: new Date() });
    }
  }

  recordEventLatency(event: string, latencyMs: number): void {
    const latencies = this.eventLatencies.get(event) || [];
    latencies.push(latencyMs);

    // Keep only last 100 measurements
    if (latencies.length > 100) {
      latencies.shift();
    }

    this.eventLatencies.set(event, latencies);
  }

  getAverageLatency(event: string): number | null {
    const latencies = this.eventLatencies.get(event);
    if (!latencies || latencies.length === 0) {
      return null;
    }

    const sum = latencies.reduce((a, b) => a + b, 0);
    return sum / latencies.length;
  }

  getMetrics(): string {
    const lines: string[] = [];

    // Connection metrics
    lines.push(`# HELP socket_connections Current number of socket connections`);
    lines.push(`# TYPE socket_connections gauge`);
    lines.push(`socket_connections ${this.connections}`);

    // Messages sent
    lines.push(`# HELP socket_messages_sent_total Total messages sent by namespace and event`);
    lines.push(`# TYPE socket_messages_sent_total counter`);
    for (const [key, data] of this.messagesSent.entries()) {
      const [namespace, event] = key.split(':');
      lines.push(`socket_messages_sent_total{namespace="${namespace}",event="${event}"} ${data.count}`);
    }

    // Messages received
    lines.push(`# HELP socket_messages_received_total Total messages received by namespace and event`);
    lines.push(`# TYPE socket_messages_received_total counter`);
    for (const [key, data] of this.messagesReceived.entries()) {
      const [namespace, event] = key.split(':');
      lines.push(`socket_messages_received_total{namespace="${namespace}",event="${event}"} ${data.count}`);
    }

    // Event latencies
    lines.push(`# HELP socket_event_latency_ms Average event processing latency in milliseconds`);
    lines.push(`# TYPE socket_event_latency_ms gauge`);
    for (const [event, latencies] of this.eventLatencies.entries()) {
      if (latencies.length > 0) {
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        lines.push(`socket_event_latency_ms{event="${event}"} ${avg.toFixed(2)}`);
      }
    }

    return lines.join('\n');
  }

  getMetricsJSON() {
    const messagesSent: Record<string, number> = {};
    for (const [key, data] of this.messagesSent.entries()) {
      messagesSent[key] = data.count;
    }

    const messagesReceived: Record<string, number> = {};
    for (const [key, data] of this.messagesReceived.entries()) {
      messagesReceived[key] = data.count;
    }

    const latencies: Record<string, number> = {};
    for (const [event, values] of this.eventLatencies.entries()) {
      if (values.length > 0) {
        latencies[event] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    }

    return {
      connections: this.connections,
      messages_sent: messagesSent,
      messages_received: messagesReceived,
      average_latencies_ms: latencies,
    };
  }

  reset(): void {
    this.connections = 0;
    this.messagesSent.clear();
    this.messagesReceived.clear();
    this.eventLatencies.clear();
  }
}

// Singleton instance
export const socketMetrics = new SocketMetrics();
