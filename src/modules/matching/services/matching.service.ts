import { prisma } from '../../../config/prisma';
import { ServiceOffer, User } from '../../../../generated/prisma/client';

type OfferWithUser = ServiceOffer & { user: User };

interface MatchResult {
  user: Omit<User, 'password'>;
  offer: ServiceOffer;
  score: number;
  matchedSkills: string[];
}

export async function getRecommendations(searchHistory: string[], limit = 5): Promise<MatchResult[]> {
  const terms = searchHistory.map((t: string) => t.toLowerCase());

  const offers = await prisma.serviceOffer.findMany({
    where: { isAvailable: true },
    include: { user: true },
  }) as OfferWithUser[];

  const scored = offers.map((offer: OfferWithUser): MatchResult => {
    let score = 0;
    const matchedSkills: string[] = [];
    const titleLower = offer.title.toLowerCase();
    const descLower = offer.description.toLowerCase();
    const categoryLower = offer.category.toLowerCase();

    for (const term of terms) {
      if (categoryLower.includes(term)) score += 40;
      if (titleLower.includes(term) || descLower.includes(term)) score += 20;
      const skillMatch = offer.user.skills.filter((s: string) => s.toLowerCase().includes(term));
      if (skillMatch.length) { score += 15; matchedSkills.push(...skillMatch); }
    }

    if (offer.user.isVerified) score += 10;
    score += offer.user.rating * 2;
    score += Math.min(offer.viewCount / 10, 5);

    const { password: _, ...safeUser } = offer.user;
    return { user: safeUser, offer, score, matchedSkills: [...new Set(matchedSkills)] };
  });

  return scored.sort((a: MatchResult, b: MatchResult) => b.score - a.score).slice(0, limit);
}
