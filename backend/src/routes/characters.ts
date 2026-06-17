import { Router } from 'express';
import {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  getLevelHistories,
  createLevelHistory,
} from '../controllers/characterController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getCharacters);
router.get('/:id', authenticate, getCharacter);
router.post('/', authenticate, requireAdmin, createCharacter);
router.put('/:id', authenticate, requireAdmin, updateCharacter);
router.delete('/:id', authenticate, requireAdmin, deleteCharacter);

router.get('/:characterId/level-histories', authenticate, getLevelHistories);
router.post('/:characterId/level-histories', authenticate, requireAdmin, createLevelHistory);

export default router;
