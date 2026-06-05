import { Router } from 'express';
import * as ctrl from '../controllers/search.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();

router.post('/', authenticate, ctrl.addTerm);
router.get('/', authenticate, ctrl.getHistory);
router.delete('/', authenticate, ctrl.clearHistory);

export default router;
