import { Router } from 'express';
import { 
  uploadImage, 
  upload
} from '../controllers/imageController';

const router = Router();

// Image routes - authentication is now handled by the gateway
// The gateway passes user information via the X-User-Info header
// This service is now completely stateless - it only handles image uploads
router.post('/upload', upload.single('image'), uploadImage);

export default router;
