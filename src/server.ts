import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ENV } from './config/env';
import { errorHandler } from './middlewares/errorHandler';
import { disconnectAll } from './events/eventBus';
import { startNotificationSubscriber } from './events/subscribers/notificationSubscriber';
import { startSearchSubscriber } from './events/subscribers/searchSubscriber';
import { startListingSubscriber } from './events/subscribers/listingSubscriber';
import { startMessageSubscriber } from './events/subscribers/messageSubscriber';

import authRoutes from './modules/auth/routes/auth.routes';
import userRoutes from './modules/user/routes/user.routes';
import listingsRoutes from './modules/listings/routes/listings.routes';
import conversationsRoutes from './modules/conversations/routes/conversations.routes';
import reviewsRoutes from './modules/reviews/routes/reviews.routes';
import matchingRoutes from './modules/matching/routes/matching.routes';
import searchRoutes from './modules/search/routes/search.routes';
import notificationsRoutes from './modules/notifications/routes/notifications.routes';
import mapRoutes from './modules/map/routes/map.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'activeyouths-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', listingsRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/matching', matchingRoutes);
app.use('/api/search-history', searchRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/map', mapRoutes);

// Propagate status from thrown errors
app.use((err: Error & { status?: number }, req: Request, res: Response, next: NextFunction) => {
  if (err.status) { res.status(err.status).json({ error: err.message }); return; }
  next(err);
});
app.use(errorHandler);

async function startSubscribers() {
  try {
    await Promise.all([
      startNotificationSubscriber(),
      startSearchSubscriber(),
      startListingSubscriber(),
      startMessageSubscriber(),
    ]);
  } catch (err) {
    console.error('[KAFKA] Failed to start subscribers:', err);
  }
}

app.listen(ENV.PORT, async () => {
  console.log(`Server running on port ${ENV.PORT}`);
  await startSubscribers();
});

process.on('SIGTERM', async () => { await disconnectAll(); process.exit(0); });
process.on('SIGINT',  async () => { await disconnectAll(); process.exit(0); });

export default app;
