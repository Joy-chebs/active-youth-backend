import * as notifCtrl from '../../src/modules/notifications/controllers/notifications.controller';
import * as searchCtrl from '../../src/modules/search/controllers/search.controller';
import { prisma } from '../../src/config/prisma';
import { mockRes, mockNext, mockReq } from '../helpers';

jest.mock('../../src/config/env', () => ({ ENV: { JWT_SECRET: 'changeme' } }));
jest.mock('../../src/events/publishers/searchPublisher', () => ({
  publishSearchRequested: jest.fn().mockResolvedValue(undefined),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const baseNotif = {
  id: 'notif-1', userId: 'user-1', type: 'new_message' as const,
  title: 'Nouveau message', body: 'Hey', isRead: false, createdAt: new Date(),
};

describe('notifications.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listNotifications returns user notifications', async () => {
    (mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([baseNotif]);
    const req = mockReq({ userId: 'user-1' });
    const res = mockRes();
    await notifCtrl.listNotifications(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith([baseNotif]);
  });

  it('markOneRead returns 204', async () => {
    (mockPrisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    const req = mockReq({ params: { id: 'notif-1' }, userId: 'user-1' });
    const res = mockRes();
    await notifCtrl.markOneRead(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('markAllRead marks all unread and returns 204', async () => {
    (mockPrisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
    const req = mockReq({ userId: 'user-1' });
    const res = mockRes();
    await notifCtrl.markAllRead(req, res, mockNext);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', isRead: false } })
    );
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('search.controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('addTerm creates term and returns 201', async () => {
    (mockPrisma.searchHistory.create as jest.Mock).mockResolvedValue({ id: 'sh-1', userId: 'user-1', term: 'design', createdAt: new Date() });
    (mockPrisma.searchHistory.findMany as jest.Mock).mockResolvedValue([{ id: 'sh-1', term: 'design', createdAt: new Date() }]);
    const req = mockReq({ userId: 'user-1', body: { term: 'design' } });
    const res = mockRes();
    await searchCtrl.addTerm(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ term: 'design' });
  });

  it('addTerm prunes to 20 entries when over limit', async () => {
    const history = Array.from({ length: 21 }, (_, i) => ({ id: `sh-${i}`, term: `term-${i}`, createdAt: new Date() }));
    (mockPrisma.searchHistory.create as jest.Mock).mockResolvedValue(history[0]);
    (mockPrisma.searchHistory.findMany as jest.Mock).mockResolvedValue(history);
    const req = mockReq({ userId: 'user-1', body: { term: 'new' } });
    const res = mockRes();
    await searchCtrl.addTerm(req, res, mockNext);
    expect(mockPrisma.searchHistory.deleteMany).toHaveBeenCalled();
  });

  it('getHistory returns array of terms', async () => {
    (mockPrisma.searchHistory.findMany as jest.Mock).mockResolvedValue([
      { id: 'sh-1', term: 'web', createdAt: new Date() },
      { id: 'sh-2', term: 'design', createdAt: new Date() },
    ]);
    const req = mockReq({ userId: 'user-1' });
    const res = mockRes();
    await searchCtrl.getHistory(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(['web', 'design']);
  });

  it('clearHistory deletes all and returns 204', async () => {
    (mockPrisma.searchHistory.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
    const req = mockReq({ userId: 'user-1' });
    const res = mockRes();
    await searchCtrl.clearHistory(req, res, mockNext);
    expect(mockPrisma.searchHistory.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
