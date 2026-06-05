import { getProducer, TOPICS } from '../eventBus';

export interface MessageSentPayload {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
}

export async function publishMessageSent(payload: MessageSentPayload): Promise<void> {
  const producer = await getProducer();
  await producer.send({
    topic: TOPICS.MESSAGE_SENT,
    messages: [{ key: payload.conversationId, value: JSON.stringify(payload) }],
  });
}
