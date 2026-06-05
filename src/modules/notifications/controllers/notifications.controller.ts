import { Response, NextFunction } from 'express';
import { prisma } from '../../../config/prisma';
import { AuthRequest } from '../../../types';

const s = (v: unknown): string => (Array.isArray(v) ? (v as string[])[0] : v) as string;

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notifications);
  } catch (e) { next(e); }
}

export async function markOneRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { id: s(req.params.id), userId: req.userId! },
      data: { isRead: true },
    });
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, isRead: false },
      data: { isRead: true },
    });
    res.status(204).send();
  } catch (e) { next(e); }
}
