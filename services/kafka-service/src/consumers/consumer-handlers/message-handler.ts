import { MessageHandler } from '../types';
import { ChatMessage } from '../../schemas/definitions/chat-message.schema';

export class ChatMessageHandler implements MessageHandler<ChatMessage> {
  async handle(message: ChatMessage): Promise<void> {
    console.log(`Processing chat message: ${message.message_id} in conversation ${message.conversation_id}`);
    // Business logic here
  }
}
