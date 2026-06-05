import bcrypt from 'bcryptjs';
import { register, login, sanitize } from '../../src/modules/auth/services/auth.service';
import { prisma } from '../../src/config/prisma';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));
jest.mock('../../src/events/publishers/userPublisher', () => ({
  publishUserRegistered: jest.fn().mockResolvedValue(undefined),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseUser = {
  id: 'u1', name: 'Alice', email: 'alice@test.com', phone: '123',
  password: '', bio: '', profileImageUrl: null, userType: 'employee' as const,
  location: '', latitude: null, longitude: null, skills: [], rating: 0,
  reviewCount: 0, isVerified: false, companyName: null, companyLogo: null,
  socialProvider: 'none' as const, createdAt: new Date(),
};

describe('auth.service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('sanitize', () => {
    it('removes password field', () => {
      const result = sanitize({ id: '1', email: 'a@b.com', password: 'secret' });
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('email');
    });
  });

  describe('register', () => {
    it('throws 409 if email already exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(baseUser);
      await expect(register({ name: 'A', email: 'alice@test.com', phone: '1', password: 'pw', userType: 'employee' }))
        .rejects.toMatchObject({ message: 'Email already in use', status: 409 });
    });

    it('creates user and returns token + user on success', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const hashedPw = await bcrypt.hash('password123', 10);
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({ ...baseUser, password: hashedPw });

      const result = await register({ name: 'Alice', email: 'new@test.com', phone: '123', password: 'password123', userType: 'employee' });

      expect(result).toHaveProperty('token');
      expect(result.user).not.toHaveProperty('password');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('throws 401 when user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(login('no@one.com', 'pw', 'employee'))
        .rejects.toMatchObject({ status: 401 });
    });

    it('throws 401 when password is wrong', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser, password: hashed });
      await expect(login('alice@test.com', 'wrong', 'employee'))
        .rejects.toMatchObject({ status: 401 });
    });

    it('throws 400 when user has no password (social login user)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser, password: null });
      await expect(login('alice@test.com', 'pw', 'employee'))
        .rejects.toMatchObject({ status: 400 });
    });

    it('returns token + user on valid credentials', async () => {
      const hashed = await bcrypt.hash('correct', 10);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser, password: hashed });
      const result = await login('alice@test.com', 'correct', 'employee');
      expect(result).toHaveProperty('token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('throws 401 when userType does not match', async () => {
      const hashed = await bcrypt.hash('pw', 10);
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...baseUser, userType: 'employer', password: hashed });
      await expect(login('alice@test.com', 'pw', 'employee'))
        .rejects.toMatchObject({ status: 401 });
    });
  });
});
