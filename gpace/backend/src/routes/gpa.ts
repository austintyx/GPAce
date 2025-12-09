import { Router } from 'express';
import { calculateGPA, getGPAHistory } from '../controllers/gpaController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Route to calculate GPA
router.post('/calculate', authenticate, calculateGPA);

// Route to get GPA history
router.get('/history', authenticate, getGPAHistory);

export default router;