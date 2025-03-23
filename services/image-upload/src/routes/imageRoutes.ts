import { Router } from 'express';
import { 
  uploadImage, 
  getUserImages, 
  deleteImage,
  upload
} from '../controllers/imageController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Image routes - all require authentication
router.post('/upload', authenticate, upload.single('image'), uploadImage);
router.get('/', authenticate, getUserImages);
router.delete('/:id', authenticate, deleteImage);

export default router;
