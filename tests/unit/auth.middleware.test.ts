import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/middlewares/auth';
import { mockRes, mockNext } from '../helpers';
import { AuthRequest } from '../../src/types';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));

function req(authHeader?: string): AuthRequest {
  return { headers: { authorization: authHeader } } as unknown as AuthRequest;
}

describe('authenticate middleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls next with userId/userType when token is valid', () => {
    const token = jwt.sign({ userId: 'u1', userType: 'employee' }, 'changeme');
    const r = req(`Bearer ${token}`);
    const res = mockRes();
    authenticate(r, res, mockNext);
    expect(r.userId).toBe('u1');
    expect(r.userType).toBe('employee');
    expect(mockNext).toHaveBeenCalled();
  });

  it('returns 401 when no token', () => {
    const res = mockRes();
    authenticate(req(), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    const res = mockRes();
    authenticate(req('Bearer bad.token.here'), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
  });

  it('returns 401 for expired token', () => {
    const token = jwt.sign({ userId: 'u1', userType: 'employee' }, 'changeme', { expiresIn: -1 });
    const res = mockRes();
    authenticate(req(`Bearer ${token}`), res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
