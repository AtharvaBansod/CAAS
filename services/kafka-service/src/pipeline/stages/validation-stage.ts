import { PipelineStage, PipelineContext } from '../message-pipeline';

export class ValidationStage<T> implements PipelineStage<T> {
  name = 'Validation';

  async process(context: PipelineContext<T>): Promise<PipelineContext<T>> {
    const { message } = context;
    if (!message.id || !message.tenant_id) {
      throw new Error('Invalid message: missing id or tenant_id');
    }
    return context;
  }
}
