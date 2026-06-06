import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../types';
import { getRecommendations } from '../services/matching.service';

export async function recommendations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { searchHistory = [], limit = 5 } = req.body;
    const results = await getRecommendations(searchHistory, limit);
    res.json({
      recommendations: results.map((r) => ({
        serviceId: r.offer.id,
        userId: r.user.id,
        score: r.score,
        matchedSkills: r.matchedSkills,
      })),
    });
  } catch (e) { next(e); }
}
