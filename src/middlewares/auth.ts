import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { AuthRequest } from '../types';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { res.status(401).json({ error: 'No token provided' }); return; }
  try {
    const payload = jwt.verify(token, ENV.JWT_SECRET) as { userId: string; userType: string };
    req.userId = payload.userId;
    req.userType = payload.userType;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
