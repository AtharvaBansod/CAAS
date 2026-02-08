import { MessageHandler } from '../types';
import { AnalyticsEvent } from '../../schemas/definitions/analytics-event.schema';

export class AnalyticsHandler implements MessageHandler<AnalyticsEvent> {
  async handle(event: AnalyticsEvent): Promise<void> {
    console.log(`Processing analytics event: ${event.event_name}`);
    // Aggregation logic
  }
}
