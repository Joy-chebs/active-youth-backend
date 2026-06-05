import { getProducer, TOPICS } from '../eventBus';

export interface SearchRequestedPayload {
  userId: string;
  term: string;
  timestamp: string;
}

export async function publishSearchRequested(payload: SearchRequestedPayload): Promise<void> {
  const producer = await getProducer();
  await producer.send({
    topic: TOPICS.SEARCH_REQUESTED,
    messages: [{ key: payload.userId, value: JSON.stringify(payload) }],
  });
}
