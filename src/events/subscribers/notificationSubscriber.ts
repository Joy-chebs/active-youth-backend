import { createConsumer, TOPICS } from '../eventBus';
import { ENV } from '../../config/env';
import { prisma } from '../../config/prisma';
import { NotificationPayload } from '../publishers/notificationPublisher';

export async function startNotificationSubscriber(): Promise<void> {
  const consumer = await createConsumer(`${ENV.KAFKA_GROUP_ID}-notifications`);

  await consumer.subscribe({ topic: TOPICS.NOTIFICATION_SEND, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const payload = JSON.parse(message.value.toString()) as NotificationPayload;

      await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
        },
      });

      console.log(`[KAFKA] Notification persisted for user ${payload.userId}: ${payload.title}`);
    },
  });

  console.log('[KAFKA] Notification subscriber running');
}
