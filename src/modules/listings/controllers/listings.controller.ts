import { Response, NextFunction } from 'express';
import { prisma } from '../../../config/prisma';
import { AuthRequest } from '../../../types';
import { uploadToCloudinary } from '../../../utils/cloudinary';
import { haversineKm } from '../../../utils/geo';
import { ServiceOffer } from '../../../../generated/prisma/client';
import { publishListingCreated, publishListingViewed } from '../../../events/publishers/listingPublisher';

const s = (v: unknown): string => (Array.isArray(v) ? (v as string[])[0] : v) as string;

export async function listServices(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = s(req.query.q) || undefined;
    const category = s(req.query.category) || undefined;
    const lat = s(req.query.lat) || undefined;
    const lng = s(req.query.lng) || undefined;
    const radiusKm = s(req.query.radiusKm) || '50';
    const page = s(req.query.page) || '1';
    const limit = s(req.query.limit) || '20';

    let services = await prisma.serviceOffer.findMany({
      where: {
        isAvailable: true,
        ...(category ? { category } : {}),
        ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] } : {}),
      },
      include: { user: { select: { id: true, name: true, profileImageUrl: true, rating: true, isVerified: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (lat && lng) {
      const radius = parseFloat(radiusKm);
      services = services.filter((svc: ServiceOffer) =>
        svc.latitude != null && svc.longitude != null &&
        haversineKm(parseFloat(lat), parseFloat(lng), svc.latitude, svc.longitude) <= radius
      );
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    res.json(services.slice(skip, skip + parseInt(limit)));
  } catch (e) { next(e); }
}

export async function getService(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const service = await prisma.serviceOffer.findUnique({
      where: { id: s(req.params.id) },
      include: { user: { select: { id: true, name: true, profileImageUrl: true, rating: true, isVerified: true } } },
    });
    if (!service) { res.status(404).json({ error: 'Service not found' }); return; }
    res.json(service);
  } catch (e) { next(e); }
}

export async function createService(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { title, description, category, price, priceType, location, latitude, longitude } = req.body as Record<string, string>;
    const service = await prisma.serviceOffer.create({
      data: {
        userId: req.userId!, title, description, category,
        price: parseFloat(price), priceType: priceType as 'fixed' | 'hourly' | 'daily',
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });
    await publishListingCreated({ serviceId: service.id, userId: service.userId, title: service.title, category: service.category, location: service.location }).catch(console.error);
    res.status(201).json(service);
  } catch (e) { next(e); }
}

export async function updateService(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    const service = await prisma.serviceOffer.findUnique({ where: { id } });
    if (!service) { res.status(404).json({ error: 'Not found' }); return; }
    if (service.userId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    const updated = await prisma.serviceOffer.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch (e) { next(e); }
}

export async function deleteService(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    const service = await prisma.serviceOffer.findUnique({ where: { id } });
    if (!service) { res.status(404).json({ error: 'Not found' }); return; }
    if (service.userId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    await prisma.serviceOffer.delete({ where: { id } });
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function uploadImages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    const service = await prisma.serviceOffer.findUnique({ where: { id } });
    if (!service) { res.status(404).json({ error: 'Not found' }); return; }
    if (service.userId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ error: 'No files provided' }); return; }
    const remaining = 5 - service.images.length;
    if (remaining <= 0) { res.status(400).json({ error: 'Max 5 images reached' }); return; }
    const urls = await Promise.all(files.slice(0, remaining).map((f: Express.Multer.File) => uploadToCloudinary(f.buffer, 'services')));
    const updated = await prisma.serviceOffer.update({ where: { id }, data: { images: [...service.images, ...urls] } });
    res.json({ images: updated.images });
  } catch (e) { next(e); }
}

export async function deleteImage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    const service = await prisma.serviceOffer.findUnique({ where: { id } });
    if (!service) { res.status(404).json({ error: 'Not found' }); return; }
    if (service.userId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return; }
    const idx = parseInt(s(req.params.imageIndex));
    const images = service.images.filter((_: string, i: number) => i !== idx);
    const updated = await prisma.serviceOffer.update({ where: { id }, data: { images } });
    res.json({ images: updated.images });
  } catch (e) { next(e); }
}

export async function incrementView(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    const userId = req.userId!;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentView = await prisma.serviceView.findFirst({ where: { serviceId: id, userId, viewedAt: { gte: oneDayAgo } } });
    if (!recentView) {
      await prisma.$transaction([
        prisma.serviceView.create({ data: { serviceId: id, userId } }),
        prisma.serviceOffer.update({ where: { id }, data: { viewCount: { increment: 1 } } }),
      ]);
      await publishListingViewed({ serviceId: id, viewerId: userId }).catch(console.error);
    }
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function getServicesByUser(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const services = await prisma.serviceOffer.findMany({
      where: { userId: s(req.params.userId) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(services);
  } catch (e) { next(e); }
}
