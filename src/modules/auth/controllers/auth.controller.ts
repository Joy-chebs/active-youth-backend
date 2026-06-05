import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../../../types';
import { prisma } from '../../../config/prisma';
import { SocialProvider, UserType } from '../../../../generated/prisma/client';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register({ ...req.body, userType: req.body.userType as UserType });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, userType } = req.body;
    const result = await authService.login(email, password, userType as UserType);
    res.json(result);
  } catch (e) { next(e); }
}

export async function socialLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { provider, token, userType } = req.body;
    const result = await authService.socialLogin(provider as SocialProvider, token, userType as UserType);
    res.json(result);
  } catch (e) { next(e); }
}

export async function logout(_req: Request, res: Response) {
  res.json({ message: 'Logged out' });
}

export async function me(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(authService.sanitize(user as unknown as Record<string, unknown>));
  } catch (e) { next(e); }
}
