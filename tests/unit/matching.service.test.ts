import { getRecommendations } from '../../src/modules/matching/services/matching.service';
import { prisma } from '../../src/config/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeOffer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'offer-1', userId: 'u1', title: 'Web Dev', description: 'React expert',
    category: 'Développement Web', price: 50000, priceType: 'hourly',
    location: 'Douala', latitude: null, longitude: null, images: [],
    isAvailable: true, viewCount: 0, createdAt: new Date(),
    user: {
      id: 'u1', name: 'Bob', email: 'bob@test.com', phone: '', password: 'hashed',
      bio: '', profileImageUrl: null, userType: 'employee', location: '',
      latitude: null, longitude: null, skills: ['React', 'Node.js'],
      rating: 4.5, reviewCount: 10, isVerified: true, companyName: null,
      companyLogo: null, socialProvider: 'none', createdAt: new Date(),
    },
    ...overrides,
  };
}

describe('matching.service - getRecommendations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty array when no offers exist', async () => {
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([]);
    const result = await getRecommendations(['web']);
    expect(result).toEqual([]);
  });

  it('scores category match (+40)', async () => {
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([makeOffer()]);
    const result = await getRecommendations(['développement web']);
    expect(result[0].score).toBeGreaterThanOrEqual(40);
  });

  it('scores keyword match in title (+20)', async () => {
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([makeOffer()]);
    const result = await getRecommendations(['web dev']);
    expect(result[0].score).toBeGreaterThan(0);
  });

  it('adds verified bonus (+10)', async () => {
    const notVerified = makeOffer({ user: { ...makeOffer().user, isVerified: false, rating: 0 } });
    const verified = makeOffer({ id: 'offer-2', user: { ...makeOffer().user, isVerified: true, rating: 0 } });
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([notVerified, verified]);
    const result = await getRecommendations([]);
    const verifiedScore = result.find(r => (r.offer as { id: string }).id === 'offer-2')!.score;
    const notVerifiedScore = result.find(r => (r.offer as { id: string }).id === 'offer-1')!.score;
    expect(verifiedScore).toBe(notVerifiedScore + 10);
  });

  it('adds skill match (+15) and returns matchedSkills', async () => {
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([makeOffer()]);
    const result = await getRecommendations(['react']);
    expect(result[0].matchedSkills).toContain('React');
    expect(result[0].score).toBeGreaterThanOrEqual(15);
  });

  it('respects limit parameter', async () => {
    const offers = Array.from({ length: 10 }, (_, i) => makeOffer({ id: `offer-${i}` }));
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue(offers);
    const result = await getRecommendations([], 3);
    expect(result).toHaveLength(3);
  });

  it('strips password from user in result', async () => {
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([makeOffer()]);
    const result = await getRecommendations([]);
    expect(result[0].user).not.toHaveProperty('password');
  });

  it('sorts results by score descending', async () => {
    const low = makeOffer({ id: 'low', user: { ...makeOffer().user, rating: 0, isVerified: false } });
    const high = makeOffer({ id: 'high', user: { ...makeOffer().user, rating: 5, isVerified: true } });
    (mockPrisma.serviceOffer.findMany as jest.Mock).mockResolvedValue([low, high]);
    const result = await getRecommendations([]);
    expect((result[0].offer as { id: string }).id).toBe('high');
  });
});
