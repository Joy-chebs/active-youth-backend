import { getProducer, TOPICS } from '../eventBus';
import { NotificationType } from '../../../generated/prisma/client';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
}

export async function publishNotification(payload: NotificationPayload): Promise<void> {
  const producer = await getProducer();
  await producer.send({
    topic: TOPICS.NOTIFICATION_SEND,
    messages: [{ key: payload.userId, value: JSON.stringify(payload) }],
  });
}
