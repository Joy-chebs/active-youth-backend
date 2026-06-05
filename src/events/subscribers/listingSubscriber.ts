import { createConsumer, TOPICS } from '../eventBus';
import { ENV } from '../../config/env';
import { prisma } from '../../config/prisma';
import { ListingCreatedPayload } from '../publishers/listingPublisher';
import { publishNotification } from '../publishers/notificationPublisher';

export async function startListingSubscriber(): Promise<void> {
  const consumer = await createConsumer(`${ENV.KAFKA_GROUP_ID}-listings`);

  await consumer.subscribe({ topic: TOPICS.LISTING_CREATED, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      const payload = JSON.parse(message.value.toString()) as ListingCreatedPayload;

      // Notify employers in the same category who have search history matching this listing
      const matchingSearches = await prisma.searchHistory.findMany({
        where: { term: { contains: payload.category, mode: 'insensitive' } },
        distinct: ['userId'],
        select: { userId: true },
      });

      for (const { userId } of matchingSearches) {
        if (userId === payload.userId) continue; // don't notify the poster
        await publishNotification({
          userId,
          type: 'new_match',
          title: 'Nouvelle offre correspondante',
          body: `"${payload.title}" vient d'être publiée à ${payload.location}`,
        });
      }

      console.log(`[KAFKA] Listing created event processed — ${matchingSearches.length} match notifications queued`);
    },
  });

  console.log('[KAFKA] Listing subscriber running');
}
