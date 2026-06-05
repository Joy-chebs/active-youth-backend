import { Router } from 'express';
import { recommendations } from '../controllers/matching.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();
router.post('/recommendations', authenticate, recommendations);
export default router;
