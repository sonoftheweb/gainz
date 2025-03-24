import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import s3Service from '../services/s3Service';
import logger from '../utils/logger';

// Configure multer for memory storage (files will be in buffer)
const storage = multer.memoryStorage();
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.') as any);
    }
  }
});

/**
 * @swagger
 * /api/images/upload:
 *   post:
 *     tags:
 *       - Images
 *     summary: Upload an image
 *     description: Upload an image file to the server, which will be stored in S3
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload (JPEG, PNG, GIF, or WebP)
 *               description:
 *                 type: string
 *                 description: Optional description for the image
 *     produces:
 *       - application/json
 *     responses:
 *       201:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: ID of the uploaded image
 *                 url:
 *                   type: string
 *                   description: URL to access the uploaded image
 *                 thumbnailUrl:
 *                   type: string
 *                   description: URL to access the thumbnail of the uploaded image
 *       400:
 *         description: Bad request - Invalid file
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export const uploadImage = async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Ensure file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const userId = req.user.userId;
    const file = req.file;
    
    // Generate a unique filename
    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname).toLowerCase();
    const baseFilename = `${userId}/${timestamp}${fileExt}`;
    const thumbnailFilename = `${userId}/${timestamp}_thumb${fileExt}`;
    
    // Generate thumbnail using sharp
    const thumbnailBuffer = await sharp(file.buffer)
      .resize(200, 200, { fit: 'cover' })
      .toBuffer();
    
    // Upload original image to S3
    const originalUrl = await s3Service.uploadFile(
      baseFilename, 
      file.buffer, 
      file.mimetype
    );
    
    // Upload thumbnail to S3
    const thumbnailUrl = await s3Service.uploadFile(
      thumbnailFilename,
      thumbnailBuffer,
      file.mimetype
    );
    
    // Generate a unique ID for the image (timestamp + random string)
    const imageId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    logger.info(`Image uploaded successfully`, { 
      imageId,
      userId,
      size: file.size
    });
    
    res.status(201).json({
      id: imageId,
      url: originalUrl,
      thumbnailUrl
    });
  } catch (error) {
    // Enhanced error logging with full details
    logger.error('Failed to upload image', { 
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
        // Include the full error object for inspection
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      } : error 
    });
    
    // Send a more informative error message if available
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
    res.status(500).json({ message: 'Failed to upload image', error: errorMessage });
  }
};


