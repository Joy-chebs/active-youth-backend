import { Response, NextFunction } from 'express';
import { prisma } from '../../../config/prisma';
import { AuthRequest } from '../../../types';

const s = (v: unknown): string => (Array.isArray(v) ? (v as string[])[0] : v) as string;

export async function getReviews(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reviews = await prisma.review.findMany({
      where: { targetUserId: s(req.params.userId) },
      include: { reviewer: { select: { id: true, name: true, profileImageUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch (e) { next(e); }
}

export async function createReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const reviewerId = req.userId!;
    const { targetUserId, rating, comment } = req.body as { targetUserId: string; rating: number; comment: string };
    if (reviewerId === targetUserId) { res.status(400).json({ error: 'Cannot review yourself' }); return; }

    const review = await prisma.review.create({ data: { reviewerId, targetUserId, rating, comment } });

    const agg = await prisma.review.aggregate({ where: { targetUserId }, _avg: { rating: true }, _count: true });
    await prisma.user.update({ where: { id: targetUserId }, data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count } });

    res.status(201).json(review);
  } catch (e) { next(e); }
}

export async function deleteReview(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) { res.status(404).json({ error: 'Not found' }); return; }
    if (review.reviewerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    await prisma.review.delete({ where: { id } });

    const agg = await prisma.review.aggregate({ where: { targetUserId: review.targetUserId }, _avg: { rating: true }, _count: true });
    await prisma.user.update({ where: { id: review.targetUserId }, data: { rating: agg._avg.rating ?? 0, reviewCount: agg._count } });

    res.status(204).send();
  } catch (e) { next(e); }
}
