import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/social-login', ctrl.socialLogin);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);

export default router;
