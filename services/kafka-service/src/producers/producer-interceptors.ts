import { KafkaMessage } from '../types/message-envelope';

export interface ProducerInterceptor {
  onSend<T>(topic: string, message: KafkaMessage<T>): Promise<KafkaMessage<T>>;
  onSuccess(topic: string, metadata: any): void;
  onError(topic: string, error: Error): void;
}

export class LoggingInterceptor implements ProducerInterceptor {
  async onSend<T>(topic: string, message: KafkaMessage<T>): Promise<KafkaMessage<T>> {
    console.debug(`[Producer] Sending to ${topic}:`, message.id);
    return message;
  }
  
  onSuccess(topic: string, metadata: any): void {
    console.debug(`[Producer] Sent to ${topic}`, metadata);
  }
  
  onError(topic: string, error: Error): void {
    console.error(`[Producer] Error sending to ${topic}`, error);
  }
}

export class TracingInterceptor implements ProducerInterceptor {
  async onSend<T>(topic: string, message: KafkaMessage<T>): Promise<KafkaMessage<T>> {
    // Inject trace ID if missing
    if (!message.trace_id) {
      message.trace_id = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return message;
  }
  
  onSuccess(topic: string, metadata: any): void {}
  onError(topic: string, error: Error): void {}
}
