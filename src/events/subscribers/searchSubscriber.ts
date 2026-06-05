import { createConsumer, TOPICS } from '../eventBus';
import { ENV } from '../../config/env';
import { SearchRequestedPayload } from '../publishers/searchPublisher';

export async function startSearchSubscriber(): Promise<void> {
  const consumer = await createConsumer(`${ENV.KAFKA_GROUP_ID}-search`);

  await consumer.subscribe({ topic: TOPICS.SEARCH_REQUESTED, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const payload = JSON.parse(message.value.toString()) as SearchRequestedPayload;

      // Hook point: feed into analytics pipeline, recommendation engine, or trending terms
      console.log(`[KAFKA] Search event — user=${payload.userId} term="${payload.term}" at ${payload.timestamp}`);
    },
  });

  console.log('[KAFKA] Search subscriber running');
}
