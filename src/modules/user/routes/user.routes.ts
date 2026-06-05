import { Router } from 'express';
import * as ctrl from '../controllers/user.controller';
import { authenticate } from '../../../middlewares/auth';
import { upload } from '../../../middlewares/upload';

const router = Router();

router.get('/', authenticate, ctrl.listUsers);
router.get('/:id', authenticate, ctrl.getUser);
router.put('/:id', authenticate, ctrl.updateUser);
router.post('/:id/avatar', authenticate, upload.single('file'), ctrl.uploadAvatar);
router.put('/:id/verify', authenticate, ctrl.verifyUser);
router.get('/:id/stats', authenticate, ctrl.getUserStats);

export default router;
