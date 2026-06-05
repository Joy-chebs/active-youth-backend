import { Router } from 'express';
import * as ctrl from '../controllers/reviews.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();

router.get('/user/:userId', authenticate, ctrl.getReviews);
router.post('/', authenticate, ctrl.createReview);
router.delete('/:id', authenticate, ctrl.deleteReview);

export default router;
