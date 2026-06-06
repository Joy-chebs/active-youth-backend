import * as matchingCtrl from '../../src/modules/matching/controllers/matching.controller';
import * as listingsCtrl from '../../src/modules/listings/controllers/listings.controller';
import { prisma } from '../../src/config/prisma';
import { mockRes, mockNext, mockReq } from '../helpers';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ── Matching controller ──────────────────────────────────────────────────────

describe('matching.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('recommendations returns scored results', async () => {
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([]);
    const req = mockReq({ userId: 'user-1', body: { searchHistory: ['web'], limit: 3 } });
    const res = mockRes();
    await matchingCtrl.recommendations(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({ recommendations: [] });
  });

  it('recommendations uses default limit when not provided', async () => {
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([]);
    const req = mockReq({ userId: 'user-1', body: { searchHistory: [] } });
    const res = mockRes();
    await matchingCtrl.recommendations(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({ recommendations: [] });
  });
});

// ── Listings controller - image endpoints ────────────────────────────────────

const baseService = {
  id: 'svc-1', userId: 'user-1', title: 'Web Dev', description: 'React',
  category: 'Développement Web', price: 50000, priceType: 'hourly',
  location: 'Douala', latitude: null, longitude: null,
  images: ['https://res.cloudinary.com/test/img1.jpg'], isAvailable: true, viewCount: 0, createdAt: new Date(),
};

describe('listings.controller - image management', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('uploadImages', () => {
    it('returns 404 when service not found', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ params: { id: 'gone' }, userId: 'user-1', files: [] });
      const res = mockRes();
      await listingsCtrl.uploadImages(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when not the owner', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue({ ...baseService, userId: 'other' });
      const req = mockReq({ params: { id: 'svc-1' }, userId: 'user-1' });
      const res = mockRes();
      await listingsCtrl.uploadImages(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 400 when no files provided', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(baseService);
      const req = mockReq({ params: { id: 'svc-1' }, userId: 'user-1', files: [] });
      const res = mockRes();
      await listingsCtrl.uploadImages(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No files provided' });
    });

    it('returns 400 when 5 images already exist', async () => {
      const full = { ...baseService, images: ['a', 'b', 'c', 'd', 'e'] };
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(full);
      const req = mockReq({ params: { id: 'svc-1' }, userId: 'user-1', files: [{ buffer: Buffer.from('x') }] });
      const res = mockRes();
      await listingsCtrl.uploadImages(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Max 5 images reached' });
    });

    it('uploads images and returns updated list', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(baseService);
      (mockPrisma.serviceOffer.update as jest.Mock).mockResolvedValue({
        ...baseService, images: [...baseService.images, 'https://res.cloudinary.com/test/new.jpg'],
      });
      const req = mockReq({
        params: { id: 'svc-1' }, userId: 'user-1',
        files: [{ buffer: Buffer.from('imgdata'), mimetype: 'image/jpeg', originalname: 'test.jpg' }],
      });
      const res = mockRes();
      await listingsCtrl.uploadImages(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ images: expect.any(Array) }));
    });
  });

  describe('deleteImage', () => {
    it('returns 404 when service not found', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ params: { id: 'gone', imageIndex: '0' }, userId: 'user-1' });
      const res = mockRes();
      await listingsCtrl.deleteImage(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when not the owner', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue({ ...baseService, userId: 'other' });
      const req = mockReq({ params: { id: 'svc-1', imageIndex: '0' }, userId: 'user-1' });
      const res = mockRes();
      await listingsCtrl.deleteImage(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('deletes image at index and returns updated images', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(baseService);
      (mockPrisma.serviceOffer.update as jest.Mock).mockResolvedValue({ ...baseService, images: [] });
      const req = mockReq({ params: { id: 'svc-1', imageIndex: '0' }, userId: 'user-1' });
      const res = mockRes();
      await listingsCtrl.deleteImage(req, res, mockNext);
      expect(mockPrisma.serviceOffer.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { images: [] } })
      );
      expect(res.json).toHaveBeenCalledWith({ images: [] });
    });
  });
});
