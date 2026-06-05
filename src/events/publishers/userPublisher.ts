import { getProducer, TOPICS } from '../eventBus';

export interface UserRegisteredPayload {
  userId: string;
  name: string;
  email: string;
  userType: string;
}

export async function publishUserRegistered(payload: UserRegisteredPayload): Promise<void> {
  const producer = await getProducer();
  await producer.send({
    topic: TOPICS.USER_REGISTERED,
    messages: [{ key: payload.userId, value: JSON.stringify(payload) }],
  });
}
