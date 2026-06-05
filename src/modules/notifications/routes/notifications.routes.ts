import { Router } from 'express';
import * as ctrl from '../controllers/notifications.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();

router.get('/', authenticate, ctrl.listNotifications);
router.put('/read-all', authenticate, ctrl.markAllRead);
router.put('/:id/read', authenticate, ctrl.markOneRead);

export default router;
