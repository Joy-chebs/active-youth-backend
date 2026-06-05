import { Response, NextFunction } from 'express';
import { prisma } from '../../../config/prisma';
import { AuthRequest } from '../../../types';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import { haversineKm } from '../../../utils/geo';
import { sanitize } from '../../auth/services/auth.service';
import { User } from '../../../../generated/prisma/client';

const s = (v: unknown): string => (Array.isArray(v) ? (v as string[])[0] : v) as string;

export async function listUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userType = s(req.query.userType) || undefined;
    const lat = s(req.query.lat) || undefined;
    const lng = s(req.query.lng) || undefined;
    const radiusKm = s(req.query.radiusKm) || '50';

    let users = await prisma.user.findMany({
      where: userType ? { userType: userType as 'employee' | 'employer' } : undefined,
    });

    if (lat && lng) {
      const radius = parseFloat(radiusKm);
      users = users.filter((u: User) =>
        u.latitude != null && u.longitude != null &&
        haversineKm(parseFloat(lat), parseFloat(lng), u.latitude, u.longitude) <= radius
      );
    }
    res.json(users.map((u: User) => sanitize(u as unknown as Record<string, unknown>)));
  } catch (e) { next(e); }
}

export async function getUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: s(req.params.id) } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(sanitize(user as unknown as Record<string, unknown>));
  } catch (e) { next(e); }
}

export async function updateUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    if (req.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }
    const { name, phone, bio, location, latitude, longitude, skills, companyName } = req.body as {
      name?: string; phone?: string; bio?: string; location?: string;
      latitude?: number; longitude?: number; skills?: string[]; companyName?: string;
    };
    const user = await prisma.user.update({ where: { id }, data: { name, phone, bio, location, latitude, longitude, skills, companyName } });
    res.json(sanitize(user as unknown as Record<string, unknown>));
  } catch (e) { next(e); }
}

export async function uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    if (req.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }
    if (!req.file) { res.status(400).json({ error: 'No file provided' }); return; }
    const url = await uploadToCloudinary(req.file.buffer, 'avatars');
    const user = await prisma.user.update({ where: { id }, data: { profileImageUrl: url } });
    res.json({ profileImageUrl: user.profileImageUrl });
  } catch (e) { next(e); }
}

export async function verifyUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    if (req.userId !== id) { res.status(403).json({ error: 'Forbidden' }); return; }
    await prisma.user.update({ where: { id }, data: { isVerified: true } });
    await prisma.notification.create({
      data: { userId: id, type: 'verification_success', title: 'Identité vérifiée', body: 'Votre identité a été vérifiée avec succès.' },
    });
    res.json({ isVerified: true });
  } catch (e) { next(e); }
}

export async function getUserStats(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = s(req.params.id);
    const [offersCount, user, totalViews] = await Promise.all([
      prisma.serviceOffer.count({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { reviewCount: true, rating: true } }),
      prisma.serviceOffer.aggregate({ where: { userId }, _sum: { viewCount: true } }),
    ]);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ offersCount, reviewCount: user.reviewCount, totalViews: totalViews._sum.viewCount ?? 0, rating: user.rating });
  } catch (e) { next(e); }
}
