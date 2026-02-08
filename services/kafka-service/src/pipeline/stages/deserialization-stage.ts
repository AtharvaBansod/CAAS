import { PipelineStage, PipelineContext } from '../message-pipeline';

export class DeserializationStage<T> implements PipelineStage<T> {
  name = 'Deserialization';

  async process(context: PipelineContext<T>): Promise<PipelineContext<T>> {
    // In a real scenario, this might parse the payload if it's a string or Buffer
    // But KafkaMessage<T> assumes it's already typed T.
    // So maybe this stage validates the structure?
    
    // For now, we pass through
    return context;
  }
}
