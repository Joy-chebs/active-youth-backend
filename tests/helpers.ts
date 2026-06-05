import jwt from 'jsonwebtoken';

export function mockRes() {
  const res: Record<string, jest.Mock> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res as unknown as import('express').Response;
}

export const mockNext = jest.fn() as import('express').NextFunction;

export function makeToken(userId = 'user-1', userType = 'employee') {
  return jwt.sign({ userId, userType }, 'changeme', { expiresIn: '1d' });
}

export function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    userId: 'user-1',
    userType: 'employee',
    ...overrides,
  } as unknown as import('../src/types').AuthRequest;
}
