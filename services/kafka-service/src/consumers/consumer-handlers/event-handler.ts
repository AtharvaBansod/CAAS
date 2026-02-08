import { MessageHandler } from '../types';

export class EventHandler implements MessageHandler<any> {
  async handle(event: any): Promise<void> {
    console.log(`Processing event: ${event.type}`);
    // Business logic here
  }
}
