import { Response, NextFunction } from 'express';
import { prisma } from '../../../config/prisma';
import { AuthRequest } from '../../../types';
import { publishMessageSent } from '../../../events/publishers/messagePublisher';

const s = (v: unknown): string => (Array.isArray(v) ? (v as string[])[0] : v) as string;

export async function listConversations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const convs = await prisma.conversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, name: true, profileImageUrl: true } },
        user2: { select: { id: true, name: true, profileImageUrl: true } },
      },
      orderBy: { lastMessageTime: 'desc' },
    });
    res.json(convs);
  } catch (e) { next(e); }
}

export async function getOrCreateConversation(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const { otherUserId } = req.body as { otherUserId: string };
    const [u1, u2] = [userId, otherUserId].sort();
    let conv = await prisma.conversation.findUnique({ where: { user1Id_user2Id: { user1Id: u1, user2Id: u2 } } });
    if (!conv) {
      conv = await prisma.conversation.create({ data: { user1Id: u1, user2Id: u2 } });
      res.status(201).json(conv);
    } else {
      res.json(conv);
    }
  } catch (e) { next(e); }
}

export async function getMessages(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    const page = s(req.query.page) || '1';
    const limit = s(req.query.limit) || '50';
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { timestamp: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });
    res.json(messages.reverse());
  } catch (e) { next(e); }
}

export async function sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const senderId = req.userId!;
    const id = s(req.params.id);
    const conv = await prisma.conversation.findUnique({ where: { id } });
    if (!conv) { res.status(404).json({ error: 'Conversation not found' }); return; }
    const receiverId = conv.user1Id === senderId ? conv.user2Id : conv.user1Id;
    const { content, imageUrl } = req.body as { content: string; imageUrl?: string };

    const [message] = await prisma.$transaction([
      prisma.message.create({ data: { conversationId: id, senderId, receiverId, content, imageUrl } }),
      prisma.conversation.update({
        where: { id },
        data: { lastMessage: content, lastMessageTime: new Date(), unreadCount: { increment: 1 } },
      }),
    ]);

    await publishMessageSent({ messageId: message.id, conversationId: id, senderId, receiverId, content }).catch(console.error);

    res.status(201).json(message);
  } catch (e) { next(e); }
}

export async function markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = s(req.params.id);
    const userId = req.userId!;
    await prisma.$transaction([
      prisma.message.updateMany({ where: { conversationId: id, receiverId: userId, isRead: false }, data: { isRead: true } }),
      prisma.conversation.update({ where: { id }, data: { unreadCount: 0 } }),
    ]);
    res.status(204).send();
  } catch (e) { next(e); }
}
