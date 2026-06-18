import { Router } from 'express';
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  updateEventCharacterRole,
  autoUpdateEventConclusion,
  checkDuplicateEvents,
  getEscalations,
  getRiskStats,
} from '../controllers/eventController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getEvents);
router.get('/risk-stats', authenticate, getRiskStats);
router.get('/escalations', authenticate, requireAdmin, getEscalations);
router.post('/check-duplicates', authenticate, requireAdmin, checkDuplicateEvents);
router.get('/:id', authenticate, getEvent);
router.post('/', authenticate, requireAdmin, createEvent);
router.put('/:id', authenticate, requireAdmin, updateEvent);
router.delete('/:id', authenticate, requireAdmin, deleteEvent);
router.put('/:eventId/characters/:characterId/role', authenticate, requireAdmin, updateEventCharacterRole);
router.post('/:id/auto-update-conclusion', authenticate, requireAdmin, autoUpdateEventConclusion);

export default router;
