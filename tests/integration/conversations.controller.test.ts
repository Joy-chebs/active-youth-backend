import * as ctrl from '../../src/modules/conversations/controllers/conversations.controller';
import { prisma } from '../../src/config/prisma';
import { mockRes, mockNext, mockReq } from '../helpers';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseConv = {
  id: 'conv-1', user1Id: 'user-1', user2Id: 'user-2',
  lastMessage: 'Hello', lastMessageTime: new Date(), unreadCount: 1, createdAt: new Date(),
};

const baseMessage = {
  id: 'msg-1', conversationId: 'conv-1', senderId: 'user-1',
  receiverId: 'user-2', content: 'Hello', imageUrl: null,
  isRead: false, timestamp: new Date(),
};

describe('conversations.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listConversations', () => {
    it('returns conversations for current user', async () => {
      (mockPrisma.conversation.findMany as jest.Mock).mockResolvedValue([baseConv]);
      const req = mockReq({ userId: 'user-1' });
      const res = mockRes();
      await ctrl.listConversations(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith([baseConv]);
    });
  });

  describe('getOrCreateConversation', () => {
    it('returns existing conversation', async () => {
      (mockPrisma.conversation.findUnique as jest.Mock).mockResolvedValue(baseConv);
      const req = mockReq({ userId: 'user-1', body: { otherUserId: 'user-2' } });
      const res = mockRes();
      await ctrl.getOrCreateConversation(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(baseConv);
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it('creates and returns 201 when no existing conversation', async () => {
      (mockPrisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.conversation.create as jest.Mock).mockResolvedValue(baseConv);
      const req = mockReq({ userId: 'user-1', body: { otherUserId: 'user-2' } });
      const res = mockRes();
      await ctrl.getOrCreateConversation(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('sorts user IDs to ensure consistent unique key', async () => {
      (mockPrisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.conversation.create as jest.Mock).mockResolvedValue(baseConv);
      const req = mockReq({ userId: 'user-9', body: { otherUserId: 'user-1' } });
      const res = mockRes();
      await ctrl.getOrCreateConversation(req, res, mockNext);
      const createCall = (mockPrisma.conversation.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.user1Id < createCall.data.user2Id).toBe(true);
    });
  });

  describe('getMessages', () => {
    it('returns paginated messages in ascending order', async () => {
      (mockPrisma.message.findMany as jest.Mock).mockResolvedValue([baseMessage]);
      const req = mockReq({ params: { id: 'conv-1' }, query: { page: '1', limit: '50' } });
      const res = mockRes();
      await ctrl.getMessages(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith([baseMessage]);
    });
  });

  describe('sendMessage', () => {
    it('returns 404 when conversation not found', async () => {
      (mockPrisma.conversation.findUnique as jest.Mock).mockResolvedValue(null);
      const req = mockReq({ params: { id: 'gone' }, userId: 'user-1', body: { content: 'Hi' } });
      const res = mockRes();
      await ctrl.sendMessage(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('sends message and returns 201', async () => {
      (mockPrisma.conversation.findUnique as jest.Mock).mockResolvedValue(baseConv);
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([baseMessage, baseConv]);
      const req = mockReq({ params: { id: 'conv-1' }, userId: 'user-1', body: { content: 'Hello' } });
      const res = mockRes();
      await ctrl.sendMessage(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(baseMessage);
    });
  });

  describe('markAsRead', () => {
    it('marks messages as read and returns 204', async () => {
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);
      const req = mockReq({ params: { id: 'conv-1' }, userId: 'user-2' });
      const res = mockRes();
      await ctrl.markAsRead(req, res, mockNext);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
