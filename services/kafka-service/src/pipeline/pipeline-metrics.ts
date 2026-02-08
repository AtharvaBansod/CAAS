export class PipelineMetrics {
  private stageDurations: Map<string, number> = new Map();
  private errors: number = 0;

  recordStageDuration(stage: string, durationMs: number) {
    this.stageDurations.set(stage, durationMs);
  }

  recordError(stage: string) {
    this.errors++;
  }

  getMetrics() {
    return {
      durations: Object.fromEntries(this.stageDurations),
      errors: this.errors
    };
  }
}
