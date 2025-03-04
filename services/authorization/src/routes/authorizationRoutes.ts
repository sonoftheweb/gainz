import { Router } from 'express';
import { validateToken } from '../controllers/authorizationController';

const router = Router();

// Authorization routes
router.post('/validate', validateToken);

export default router;
