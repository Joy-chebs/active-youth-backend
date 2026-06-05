import { register, login, logout, me } from '../../src/modules/auth/controllers/auth.controller';
import { prisma } from '../../src/config/prisma';
import { mockRes, mockNext, mockReq } from '../helpers';
import bcrypt from 'bcryptjs';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));
jest.mock('../../src/modules/auth/services/auth.service', () => {
  const actual = jest.requireActual('../../src/modules/auth/services/auth.service');
  return { ...actual };
});

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseUser = {
  id: 'u1', name: 'Alice', email: 'alice@test.com', phone: '123',
  password: '', bio: '', profileImageUrl: null, userType: 'employee' as const,
  location: '', latitude: null, longitude: null, skills: [],
  rating: 0, reviewCount: 0, isVerified: false, companyName: null,
  companyLogo: null, socialProvider: 'none' as const, createdAt: new Date(),
};

describe('auth.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('responds 201 with token on success', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({ ...baseUser, password: 'hashed' });
      const req = mockReq({ body: { name: 'Alice', email: 'alice@test.com', phone: '123', password: 'pass123', userType: 'employee' } });
      const res = mockRes();
      await register(req as unknown as import('express').Request, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
    });

    it('calls next on duplicate email error', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      const req = mockReq({ body: { name: 'Alice', email: 'alice@test.com', phone: '123', password: 'pass', userType: 'employee' } });
      const res = mockRes();
      await register(req as unknown as import('express').Request, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('responds 200 with token on valid credentials', async () => {
      const hashed = await bcrypt.hash('pass123', 10);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser, password: hashed });
      const req = mockReq({ body: { email: 'alice@test.com', password: 'pass123', userType: 'employee' } });
      const res = mockRes();
      await login(req as unknown as import('express').Request, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
    });

    it('calls next on invalid credentials', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ body: { email: 'no@one.com', password: 'pw', userType: 'employee' } });
      const res = mockRes();
      await login(req as unknown as import('express').Request, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('responds with message', async () => {
      const res = mockRes();
      await logout(mockReq() as unknown as import('express').Request, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out' });
    });
  });

  describe('me', () => {
    it('returns sanitized user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser, password: 'hashed' });
      const req = mockReq({ userId: 'u1' });
      const res = mockRes();
      await me(req, res, mockNext);
      const json = (res.json as jest.Mock).mock.calls[0][0];
      expect(json).not.toHaveProperty('password');
      expect(json).toHaveProperty('email');
    });

    it('returns 404 when user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ userId: 'ghost' });
      const res = mockRes();
      await me(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
