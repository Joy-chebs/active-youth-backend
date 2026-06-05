import * as ctrl from '../../src/modules/listings/controllers/listings.controller';
import { prisma } from '../../src/config/prisma';
import { mockRes, mockNext, mockReq } from '../helpers';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseService = {
  id: 'svc-1', userId: 'user-1', title: 'Web Dev', description: 'React',
  category: 'Développement Web', price: 50000, priceType: 'hourly',
  location: 'Douala', latitude: null, longitude: null,
  images: [], isAvailable: true, viewCount: 0, createdAt: new Date(),
};

describe('listings.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listServices', () => {
    it('returns available services', async () => {
      (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([baseService]);
      const req = mockReq({ query: {} });
      const res = mockRes();
      await ctrl.listServices(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ id: 'svc-1' })]));
    });

    it('filters by geo radius when lat/lng provided', async () => {
      const nearby = { ...baseService, id: 'nearby', latitude: 4.05, longitude: 9.77 };
      const far = { ...baseService, id: 'far', latitude: 10, longitude: 20 };
      (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([nearby, far]);
      const req = mockReq({ query: { lat: '4.05', lng: '9.77', radiusKm: '10' } });
      const res = mockRes();
      await ctrl.listServices(req, res, mockNext);
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.some((s: { id: string }) => s.id === 'nearby')).toBe(true);
      expect(result.some((s: { id: string }) => s.id === 'far')).toBe(false);
    });
  });

  describe('getService', () => {
    it('returns service when found', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(baseService);
      const req = mockReq({ params: { id: 'svc-1' } });
      const res = mockRes();
      await ctrl.getService(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(baseService);
    });

    it('returns 404 when not found', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ params: { id: 'missing' } });
      const res = mockRes();
      await ctrl.getService(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createService', () => {
    it('creates service and returns 201', async () => {
      (mockPrisma.serviceOffer.create as jest.Mock).mockResolvedValue(baseService);
      const req = mockReq({
        userId: 'user-1',
        body: { title: 'Web Dev', description: 'React', category: 'Développement Web', price: '50000', priceType: 'hourly', location: 'Douala' },
      });
      const res = mockRes();
      await ctrl.createService(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(baseService);
    });
  });

  describe('updateService', () => {
    it('returns 403 when user is not owner', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue({ ...baseService, userId: 'other-user' });
      const req = mockReq({ params: { id: 'svc-1' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.updateService(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('updates and returns service', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(baseService);
      (mockPrisma.serviceOffer.update as jest.Mock).mockResolvedValue({ ...baseService, title: 'Updated' });
      const req = mockReq({ params: { id: 'svc-1' }, userId: 'user-1', body: { title: 'Updated' } });
      const res = mockRes();
      await ctrl.updateService(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated' }));
    });
  });

  describe('deleteService', () => {
    it('returns 204 on success', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(baseService);
      (mockPrisma.serviceOffer.delete as jest.Mock).mockResolvedValue(baseService);
      const req = mockReq({ params: { id: 'svc-1' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.deleteService(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('returns 404 when service not found', async () => {
      (mockPrisma.serviceOffer.findUnique as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ params: { id: 'gone' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.deleteService(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('incrementView', () => {
    it('increments view when no recent view exists', async () => {
      (mockPrisma.serviceView.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);
      const req = mockReq({ params: { id: 'svc-1' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.incrementView(req, res, mockNext);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('skips increment when recent view exists', async () => {
      (mockPrisma.serviceView.findFirst as jest.Mock).mockResolvedValue({ id: 'v1' });
      const req = mockReq({ params: { id: 'svc-1' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.incrementView(req, res, mockNext);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });

  describe('getServicesByUser', () => {
    it('returns all services for a user', async () => {
      (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([baseService]);
      const req = mockReq({ params: { userId: 'user-1' } });
      const res = mockRes();
      await ctrl.getServicesByUser(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith([baseService]);
    });
  });
});
