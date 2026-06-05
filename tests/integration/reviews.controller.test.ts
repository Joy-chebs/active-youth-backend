import * as ctrl from '../../src/modules/reviews/controllers/reviews.controller';
import { prisma } from '../../src/config/prisma';
import { mockRes, mockNext, mockReq } from '../helpers';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseReview = {
  id: 'rev-1', reviewerId: 'user-1', targetUserId: 'user-2',
  rating: 4, comment: 'Great!', createdAt: new Date(),
};

describe('reviews.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getReviews', () => {
    it('returns reviews for a user', async () => {
      (mockPrisma.review.findMany as jest.Mock).mockResolvedValue([baseReview]);
      const req = mockReq({ params: { userId: 'user-2' } });
      const res = mockRes();
      await ctrl.getReviews(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith([baseReview]);
    });
  });

  describe('createReview', () => {
    it('returns 400 when reviewing yourself', async () => {
      const req = mockReq({ userId: 'user-1', body: { targetUserId: 'user-1', rating: 5, comment: 'Me' } });
      const res = mockRes();
      await ctrl.createReview(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates review and recalculates rating', async () => {
      (mockPrisma.review.create as jest.Mock).mockResolvedValue(baseReview);
      (mockPrisma.review.aggregate as jest.Mock).mockResolvedValue({ _avg: { rating: 4 }, _count: 1 });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
      const req = mockReq({ userId: 'user-1', body: { targetUserId: 'user-2', rating: 4, comment: 'Great!' } });
      const res = mockRes();
      await ctrl.createReview(req, res, mockNext);
      expect(mockPrisma.review.create).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { rating: 4, reviewCount: 1 } }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteReview', () => {
    it('returns 404 when review not found', async () => {
      (mockPrisma.review.findUnique as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ params: { id: 'gone' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.deleteReview(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when not the reviewer', async () => {
      (mockPrisma.review.findUnique as jest.Mock).mockResolvedValue({ ...baseReview, reviewerId: 'other' });
      const req = mockReq({ params: { id: 'rev-1' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.deleteReview(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('deletes review and recalculates rating', async () => {
      (mockPrisma.review.findUnique as jest.Mock).mockResolvedValue(baseReview);
      (mockPrisma.review.delete as jest.Mock).mockResolvedValue(baseReview);
      (mockPrisma.review.aggregate as jest.Mock).mockResolvedValue({ _avg: { rating: null }, _count: 0 });
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
      const req = mockReq({ params: { id: 'rev-1' }, userId: 'user-1' });
      const res = mockRes();
      await ctrl.deleteReview(req, res, mockNext);
      expect(mockPrisma.review.delete).toHaveBeenCalled();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { rating: 0, reviewCount: 0 } }));
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
