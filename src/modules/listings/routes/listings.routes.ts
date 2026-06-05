import { Router } from 'express';
import * as ctrl from '../controllers/listings.controller';
import { authenticate } from '../../../middlewares/auth';
import { upload } from '../../../middlewares/upload';

const router = Router();

router.get('/', authenticate, ctrl.listServices);
router.get('/user/:userId', authenticate, ctrl.getServicesByUser);
router.get('/:id', authenticate, ctrl.getService);
router.post('/', authenticate, ctrl.createService);
router.put('/:id', authenticate, ctrl.updateService);
router.delete('/:id', authenticate, ctrl.deleteService);
router.post('/:id/images', authenticate, upload.array('files', 5), ctrl.uploadImages);
router.delete('/:id/images/:imageIndex', authenticate, ctrl.deleteImage);
router.post('/:id/view', authenticate, ctrl.incrementView);

export default router;
