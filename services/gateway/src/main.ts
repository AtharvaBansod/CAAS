import { buildApp } from './app';
import { config } from './config';
import { webhookConsumer } from './consumers/webhook-consumer';

const main = async () => {
  try {
    const app = await buildApp();

    // Start Webhook Consumer
    await webhookConsumer.start();

    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`Server listening at http://0.0.0.0:${config.PORT}`);
    console.log(`Documentation at http://0.0.0.0:${config.PORT}/documentation`);

    // Graceful Shutdown
    const closeGracefully = async (signal: string) => {
      console.log(`Received ${signal}, shutting down...`);
      await webhookConsumer.stop();
      await app.close();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
