import { Response, NextFunction } from 'express';
import { prisma } from '../../../config/prisma';
import { AuthRequest } from '../../../types';
import { SearchHistory } from '../../../../generated/prisma/client';
import { publishSearchRequested } from '../../../events/publishers/searchPublisher';

export async function addTerm(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { term } = req.body as { term: string };
    await prisma.searchHistory.create({ data: { userId: req.userId!, term } });
    await publishSearchRequested({ userId: req.userId!, term, timestamp: new Date().toISOString() }).catch(console.error);
    const all = await prisma.searchHistory.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    if (all.length > 20) {
      const toDelete = all.slice(20).map((r: SearchHistory) => r.id);
      await prisma.searchHistory.deleteMany({ where: { id: { in: toDelete } } });
    }
    res.status(201).json({ term });
  } catch (e) { next(e); }
}

export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const history = await prisma.searchHistory.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(history.map((h: SearchHistory) => h.term));
  } catch (e) { next(e); }
}

export async function clearHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.searchHistory.deleteMany({ where: { userId: req.userId! } });
    res.status(204).send();
  } catch (e) { next(e); }
}
