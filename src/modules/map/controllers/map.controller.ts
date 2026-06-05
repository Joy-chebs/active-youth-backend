import { Response, NextFunction } from 'express';
import { prisma } from '../../../config/prisma';
import { AuthRequest } from '../../../types';
import { haversineKm } from '../../../utils/geo';
import { sanitize } from '../../auth/services/auth.service';
import { User, ServiceOffer } from '../../../../generated/prisma/client';

export async function nearbyUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lat = req.query.lat as string;
    const lng = req.query.lng as string;
    const radiusKm = (req.query.radiusKm as string) ?? '50';
    if (!lat || !lng) { res.status(400).json({ error: 'lat and lng required' }); return; }
    const users = await prisma.user.findMany({ where: { latitude: { not: null }, longitude: { not: null } } });
    const radius = parseFloat(radiusKm);
    const nearby = users.filter((u: User) =>
      haversineKm(parseFloat(lat), parseFloat(lng), u.latitude!, u.longitude!) <= radius
    );
    res.json(nearby.map((u: User) => sanitize(u as unknown as Record<string, unknown>)));
  } catch (e) { next(e); }
}

export async function nearbyServices(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lat = req.query.lat as string;
    const lng = req.query.lng as string;
    const radiusKm = (req.query.radiusKm as string) ?? '50';
    if (!lat || !lng) { res.status(400).json({ error: 'lat and lng required' }); return; }
    const services = await prisma.serviceOffer.findMany({
      where: { latitude: { not: null }, longitude: { not: null }, isAvailable: true },
      include: { user: { select: { id: true, name: true, profileImageUrl: true, rating: true } } },
    });
    const radius = parseFloat(radiusKm);
    const nearby = services.filter((s: ServiceOffer) =>
      haversineKm(parseFloat(lat), parseFloat(lng), s.latitude!, s.longitude!) <= radius
    );
    res.json(nearby);
  } catch (e) { next(e); }
}
