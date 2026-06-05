import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../../config/prisma';
import { ENV } from '../../../config/env';
import { SocialProvider, UserType } from '../../../../generated/prisma/client';
import { publishUserRegistered } from '../../../events/publishers/userPublisher';

function signToken(userId: string, userType: string) {
  return jwt.sign({ userId, userType }, ENV.JWT_SECRET, { expiresIn: '30d' });
}

export async function register(data: {
  name: string; email: string; phone: string;
  password: string; userType: UserType; companyName?: string;
}) {
  const exists = await prisma.user.findUnique({ where: { email: data.email } });
  if (exists) throw Object.assign(new Error('Email already in use'), { status: 409 });

  const hashed = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: data.name, email: data.email, phone: data.phone,
      password: hashed, userType: data.userType,
      companyName: data.companyName ?? null,
    },
  });
  await publishUserRegistered({ userId: user.id, name: user.name, email: user.email, userType: user.userType }).catch(console.error);
  return { token: signToken(user.id, user.userType), user: sanitize(user) };
}

export async function login(email: string, password: string, userType: UserType) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.userType !== userType) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  if (!user.password) throw Object.assign(new Error('Use social login'), { status: 400 });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  return { token: signToken(user.id, user.userType), user: sanitize(user) };
}

export async function socialLogin(provider: SocialProvider, token: string, userType: UserType) {
  const profile = await verifySocialToken(provider, token);
  let user = await prisma.user.findUnique({ where: { email: profile.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: profile.name, email: profile.email, phone: '',
        userType, socialProvider: provider,
        profileImageUrl: profile.picture ?? null,
      },
    });
  }
  return { token: signToken(user.id, user.userType), user: sanitize(user) };
}

async function verifySocialToken(provider: SocialProvider, token: string) {
  if (provider === 'google') {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!res.ok) throw Object.assign(new Error('Invalid Google token'), { status: 401 });
    const d = await res.json() as { email: string; name: string; picture?: string };
    return d;
  }
  if (provider === 'facebook') {
    const res = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`);
    if (!res.ok) throw Object.assign(new Error('Invalid Facebook token'), { status: 401 });
    const d = await res.json() as { email: string; name: string; picture?: { data?: { url?: string } } };
    return { email: d.email, name: d.name, picture: d.picture?.data?.url };
  }
  throw Object.assign(new Error('Unsupported provider'), { status: 400 });
}

export function sanitize(user: Record<string, unknown>) {
  const { password: _, ...rest } = user;
  return rest;
}
