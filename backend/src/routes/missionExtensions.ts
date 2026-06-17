import { Router } from 'express';
import {
  createExtensionRequest,
  getExtensionRequests,
  getPendingExtensionRequests,
  getPendingExtensionCount,
  getExtensionRequest,
  approveExtensionRequest,
  getMissionExtensionRequests,
} from '../controllers/missionExtensionController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getExtensionRequests);
router.post('/', authenticate, createExtensionRequest);
router.get('/pending', authenticate, getPendingExtensionRequests);
router.get('/pending/count', authenticate, getPendingExtensionCount);
router.get('/:id', authenticate, getExtensionRequest);
router.put('/:id/approve', authenticate, requireAdmin, approveExtensionRequest);
router.get('/mission/:missionId', authenticate, getMissionExtensionRequests);

export default router;
