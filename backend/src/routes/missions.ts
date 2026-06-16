import { Router } from 'express';
import {
  getMissions,
  getMission,
  createMission,
  updateMission,
  deleteMission,
} from '../controllers/missionController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getMissions);
router.get('/:id', authenticate, getMission);
router.post('/', authenticate, requireAdmin, createMission);
router.put('/:id', authenticate, requireAdmin, updateMission);
router.delete('/:id', authenticate, requireAdmin, deleteMission);

export default router;
