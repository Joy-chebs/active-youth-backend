import * as ctrl from '../../src/modules/user/controllers/user.controller';
import { prisma } from '../../src/config/prisma';
import { mockRes, mockNext, mockReq } from '../helpers';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseUser = {
  id: 'user-1', name: 'Alice', email: 'alice@test.com', phone: '123',
  password: 'hashed', bio: '', profileImageUrl: null, userType: 'employee' as const,
  location: 'Douala', latitude: 4.05, longitude: 9.77, skills: [],
  rating: 4.0, reviewCount: 2, isVerified: false, companyName: null,
  companyLogo: null, socialProvider: 'none' as const, createdAt: new Date(),
};

describe('user.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listUsers', () => {
    it('returns all users', async () => {
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([baseUser]);
      const req = mockReq({ query: {} });
      const res = mockRes();
      await ctrl.listUsers(req, res, mockNext);
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result[0]).not.toHaveProperty('password');
    });

    it('filters by geo radius', async () => {
      const nearUser = { ...baseUser, id: 'near', latitude: 4.06, longitude: 9.78 };
      const farUser = { ...baseUser, id: 'far', latitude: 20, longitude: 50 };
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([nearUser, farUser]);
      const req = mockReq({ query: { lat: '4.05', lng: '9.77', radiusKm: '5' } });
      const res = mockRes();
      await ctrl.listUsers(req, res, mockNext);
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.some((u: { id: string }) => u.id === 'near')).toBe(true);
      expect(result.some((u: { id: string }) => u.id === 'far')).toBe(false);
    });
  });

  describe('getUser', () => {
    it('returns sanitized user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      const req = mockReq({ params: { id: 'user-1' } });
      const res = mockRes();
      await ctrl.getUser(req, res, mockNext);
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result).not.toHaveProperty('password');
    });

    it('returns 404 when not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ params: { id: 'ghost' } });
      const res = mockRes();
      await ctrl.getUser(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateUser', () => {
    it('returns 403 when updating another user', async () => {
      const req = mockReq({ params: { id: 'user-2' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.updateUser(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('updates and returns sanitized user', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({ ...baseUser, name: 'Updated' });
      const req = mockReq({ params: { id: 'user-1' }, userId: 'user-1', body: { name: 'Updated' } });
      const res = mockRes();
      await ctrl.updateUser(req, res, mockNext);
      const result = (res.json as jest.Mock).mock.calls[0][0];
      expect(result.name).toBe('Updated');
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('verifyUser', () => {
    it('returns 403 when verifying another user', async () => {
      const req = mockReq({ params: { id: 'user-2' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.verifyUser(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('sets isVerified and creates notification', async () => {
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({ ...baseUser, isVerified: true });
      (mockPrisma.notification.create as jest.Mock).mockResolvedValue({});
      const req = mockReq({ params: { id: 'user-1' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.verifyUser(req, res, mockNext);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isVerified: true } }));
      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ isVerified: true });
    });
  });

  describe('getUserStats', () => {
    it('returns correct stats', async () => {
      (mockPrisma.serviceOffer.count as jest.Mock).mockResolvedValue(3);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ reviewCount: 5, rating: 4.2 });
      (mockPrisma.serviceOffer.aggregate as jest.Mock).mockResolvedValue({ _sum: { viewCount: 100 } });
      const req = mockReq({ params: { id: 'user-1' } });
      const res = mockRes();
      await ctrl.getUserStats(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith({ offersCount: 3, reviewCount: 5, totalViews: 100, rating: 4.2 });
    });

    it('returns 404 when user not found', async () => {
      (mockPrisma.serviceOffer.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.serviceOffer.aggregate as jest.Mock).mockResolvedValue({ _sum: { viewCount: 0 } });
      const req = mockReq({ params: { id: 'ghost' } });
      const res = mockRes();
      await ctrl.getUserStats(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
