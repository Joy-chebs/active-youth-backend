import * as ctrl from '../../src/modules/map/controllers/map.controller';
import { prisma } from '../../src/config/prisma';
import { mockRes, mockNext, mockReq } from '../helpers';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const nearUser = { id: 'u1', name: 'Alice', email: 'a@b.com', phone: '', password: 'h',
  bio: '', profileImageUrl: null, userType: 'employee', location: 'Douala',
  latitude: 4.06, longitude: 9.78, skills: [], rating: 0, reviewCount: 0,
  isVerified: false, companyName: null, companyLogo: null, socialProvider: 'none', createdAt: new Date() };

const farUser = { ...nearUser, id: 'u2', latitude: 20, longitude: 50 };

const nearService = { id: 'svc-1', userId: 'u1', title: 'Web', description: '', category: 'Dev',
  price: 1000, priceType: 'fixed', location: 'Douala', latitude: 4.06, longitude: 9.78,
  images: [], isAvailable: true, viewCount: 0, createdAt: new Date() };

const farService = { ...nearService, id: 'svc-2', latitude: 20, longitude: 50 };

describe('map.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('nearbyUsers', () => {
    it('returns 400 when lat/lng missing', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      await ctrl.nearbyUsers(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('filters users within radius', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([nearUser, farUser]);
      const req = mockReq({ query: { lat: '4.05', lng: '9.77', radiusKm: '5' } });
      const res = mockRes();
      await ctrl.nearbyUsers(req, res, mockNext);
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.some((u: { id: string }) => u.id === 'u1')).toBe(true);
      expect(result.some((u: { id: string }) => u.id === 'u2')).toBe(false);
    });

    it('strips password from returned users', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([nearUser]);
      const req = mockReq({ query: { lat: '4.05', lng: '9.77', radiusKm: '50' } });
      const res = mockRes();
      await ctrl.nearbyUsers(req, res, mockNext);
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result[0]).not.toHaveProperty('password');
    });
  });

  describe('nearbyServices', () => {
    it('returns 400 when lat/lng missing', async () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      await ctrl.nearbyServices(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('filters services within radius', async () => {
      (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([nearService, farService]);
      const req = mockReq({ query: { lat: '4.05', lng: '9.77', radiusKm: '5' } });
      const res = mockRes();
      await ctrl.nearbyServices(req, res, mockNext);
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.some((s: { id: string }) => s.id === 'svc-1')).toBe(true);
      expect(result.some((s: { id: string }) => s.id === 'svc-2')).toBe(false);
    });
  });
});
