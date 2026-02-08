import { KafkaMessage } from '../types/message-envelope';

export interface PipelineContext<T> {
  message: KafkaMessage<T>;
  metadata: Record<string, any>;
  aborted: boolean;
  error?: Error;
}

export interface PipelineStage<T> {
  name: string;
  process(context: PipelineContext<T>): Promise<PipelineContext<T>>;
}

export class MessagePipeline<T> {
  constructor(private stages: PipelineStage<T>[]) {}

  async process(message: KafkaMessage<T>): Promise<PipelineContext<T>> {
    let context: PipelineContext<T> = {
      message,
      metadata: {},
      aborted: false
    };

    for (const stage of this.stages) {
      if (context.aborted) break;
      
      try {
        context = await stage.process(context);
      } catch (error) {
        console.error(`Pipeline stage ${stage.name} failed:`, error);
        context.error = error as Error;
        context.aborted = true;
        break;
      }
    }

    return context;
  }
}
