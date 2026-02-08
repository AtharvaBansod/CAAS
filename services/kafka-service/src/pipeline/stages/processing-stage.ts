import { PipelineStage, PipelineContext } from '../message-pipeline';
import { MessageHandler } from '../../consumers/types';

export class ProcessingStage<T> implements PipelineStage<T> {
  name = 'Processing';

  constructor(private handler: MessageHandler<T>) {}

  async process(context: PipelineContext<T>): Promise<PipelineContext<T>> {
    await this.handler.handle(context.message.payload);
    return context;
  }
}
