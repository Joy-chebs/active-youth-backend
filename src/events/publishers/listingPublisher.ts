import { getProducer, TOPICS } from '../eventBus';

export interface ListingCreatedPayload {
  serviceId: string;
  userId: string;
  title: string;
  category: string;
  location: string;
}

export interface ListingViewedPayload {
  serviceId: string;
  viewerId: string;
}

export async function publishListingCreated(payload: ListingCreatedPayload): Promise<void> {
  const producer = await getProducer();
  await producer.send({
    topic: TOPICS.LISTING_CREATED,
    messages: [{ key: payload.serviceId, value: JSON.stringify(payload) }],
  });
}

export async function publishListingViewed(payload: ListingViewedPayload): Promise<void> {
  const producer = await getProducer();
  await producer.send({
    topic: TOPICS.LISTING_VIEWED,
    messages: [{ key: payload.serviceId, value: JSON.stringify(payload) }],
  });
}
