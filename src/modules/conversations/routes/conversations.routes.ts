import { Router } from 'express';
import * as ctrl from '../controllers/conversations.controller';
import { authenticate } from '../../../middlewares/auth';

const router = Router();

router.get('/', authenticate, ctrl.listConversations);
router.post('/', authenticate, ctrl.getOrCreateConversation);
router.get('/:id/messages', authenticate, ctrl.getMessages);
router.post('/:id/messages', authenticate, ctrl.sendMessage);
router.put('/:id/read', authenticate, ctrl.markAsRead);

export default router;
