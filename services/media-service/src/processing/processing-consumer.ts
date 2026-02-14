import { Kafka, Consumer } from 'kafkajs';
import { MediaRepository } from '../media/media.repository';
import { ImageProcessor } from './image-processor';
import { Media } from '../media/media.types';

export class ProcessingConsumer {
  private consumer: Consumer;
  private imageProcessor: ImageProcessor;

  constructor(
    kafka: Kafka,
    private mediaRepo: MediaRepository
  ) {
    this.consumer = kafka.consumer({ groupId: 'media-processing-group' });
    this.imageProcessor = new ImageProcessor();
  }

  async start() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'media-processing', fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value!.toString());
          
          if (event.type === 'media.uploaded') {
            await this.processMedia(event.data);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      },
    });
  }

  private async processMedia(media: Media) {
    try {
      console.log(`Processing media ${media.id} of type ${media.type}`);

      // Update status to processing
      await this.mediaRepo.updateStatus(media.id, 'processing');

      let result;

      // Process based on type
      switch (media.type) {
        case 'image':
          result = await this.imageProcessor.process(media);
          break;
        case 'video':
          // Video processing would go here
          console.log('Video processing not yet implemented');
          result = {};
          break;
        case 'audio':
          // Audio processing would go here
          console.log('Audio processing not yet implemented');
          result = {};
          break;
        case 'file':
          // Document processing would go here
          console.log('Document processing not yet implemented');
          result = {};
          break;
        default:
          throw new Error(`Unknown media type: ${media.type}`);
      }

      // Update status to ready with processing results
      await this.mediaRepo.updateStatus(media.id, 'ready', result);

      console.log(`Successfully processed media ${media.id}`);
    } catch (error) {
      console.error(`Failed to process media ${media.id}:`, error);
      await this.mediaRepo.updateStatus(media.id, 'failed');
    }
  }

  async shutdown() {
    await this.consumer.disconnect();
  }
}
