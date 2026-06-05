import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import { ENV } from '../config/env';

const kafka = new Kafka({
  clientId: ENV.KAFKA_CLIENT_ID,
  brokers: ENV.KAFKA_BROKERS,
  logLevel: logLevel.WARN,
});

let producer: Producer | null = null;

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer();
    await producer.connect();
  }
  return producer;
}

export async function createConsumer(groupId: string): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await consumer.connect();
  return consumer;
}

export async function disconnectAll(): Promise<void> {
  if (producer) await producer.disconnect();
}

// Topic registry — single source of truth
export const TOPICS = {
  USER_REGISTERED:    'user.registered',
  LISTING_CREATED:    'listing.created',
  LISTING_VIEWED:     'listing.viewed',
  MESSAGE_SENT:       'message.sent',
  REVIEW_CREATED:     'review.created',
  NOTIFICATION_SEND:  'notification.send',
  SEARCH_REQUESTED:   'search.requested',
} as const;

export type Topic = typeof TOPICS[keyof typeof TOPICS];
