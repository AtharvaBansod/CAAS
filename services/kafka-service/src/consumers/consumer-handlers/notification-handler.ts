import { MessageHandler } from '../types';
import { Notification } from '../../schemas/definitions/notification.schema';

export class NotificationHandler implements MessageHandler<Notification> {
  async handle(notification: Notification): Promise<void> {
    console.log(`Processing notification for user: ${notification.user_id}`);
    // Dispatch notification
  }
}
