import { Router } from 'express';
import {
  getCharacters,
  getCharacter,
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from '../controllers/characterController';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getCharacters);
router.get('/:id', authenticate, getCharacter);
router.post('/', authenticate, requireAdmin, createCharacter);
router.put('/:id', authenticate, requireAdmin, updateCharacter);
router.delete('/:id', authenticate, requireAdmin, deleteCharacter);

export default router;
