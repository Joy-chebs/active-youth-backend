import { Router } from 'express';
import * as ctrl from '../controllers/map.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();

router.get('/users', authenticate, ctrl.nearbyUsers);
router.get('/services', authenticate, ctrl.nearbyServices);

export default router;
