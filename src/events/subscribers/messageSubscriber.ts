import { createConsumer, TOPICS } from '../eventBus';
import { ENV } from '../../config/env';
import { MessageSentPayload } from '../publishers/messagePublisher';
import { publishNotification } from '../publishers/notificationPublisher';

export async function startMessageSubscriber(): Promise<void> {
  const consumer = await createConsumer(`${ENV.KAFKA_GROUP_ID}-messages`);

  await consumer.subscribe({ topic: TOPICS.MESSAGE_SENT, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const payload = JSON.parse(message.value.toString()) as MessageSentPayload;

      await publishNotification({
        userId: payload.receiverId,
        type: 'new_message',
        title: 'Nouveau message',
        body: payload.content.slice(0, 100),
      });

      console.log(`[KAFKA] Message event — notifying receiver ${payload.receiverId}`);
    },
  });

  console.log('[KAFKA] Message subscriber running');
}
