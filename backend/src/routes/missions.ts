import { Router } from 'express';
import {
  getMissions,
  getMission,
  createMission,
  updateMission,
  deleteMission,
  completeMission,
  batchAssignCharacters,
  batchUpdatePriority,
  batchUpdateDueDate,
  getMissionChangeLogs,
} from '../controllers/missionController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getMissions);
router.get('/:id', authenticate, getMission);
router.get('/:id/change-logs', authenticate, getMissionChangeLogs);
router.post('/', authenticate, requireAdmin, createMission);
router.post('/batch/assign', authenticate, requireAdmin, batchAssignCharacters);
router.post('/batch/priority', authenticate, requireAdmin, batchUpdatePriority);
router.post('/batch/due-date', authenticate, requireAdmin, batchUpdateDueDate);
router.post('/:id/complete', authenticate, requireAdmin, completeMission);
router.put('/:id', authenticate, requireAdmin, updateMission);
router.delete('/:id', authenticate, requireAdmin, deleteMission);

export default router;
