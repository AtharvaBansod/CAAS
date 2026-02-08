import { PipelineStage, MessagePipeline } from './message-pipeline';

export class PipelineBuilder<T> {
  private stages: PipelineStage<T>[] = [];

  addStage(stage: PipelineStage<T>): this {
    this.stages.push(stage);
    return this;
  }

  build(): MessagePipeline<T> {
    return new MessagePipeline(this.stages);
  }
}
