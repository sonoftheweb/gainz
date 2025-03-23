import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import s3Service from '../services/s3Service';
import logger from '../utils/logger';

const prisma = new PrismaClient();

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
    
    // Record in database
    const image = await prisma.image.create({
      data: {
        filename: path.basename(file.originalname),
        originalUrl,
        thumbnailUrl,
        mimeType: file.mimetype,
        size: file.size,
        userId
      }
    });
    
    logger.info(`Image uploaded successfully`, { 
      imageId: image.id,
      userId,
      size: file.size
    });
    
    res.status(201).json({
      id: image.id,
      url: originalUrl,
      thumbnailUrl
    });
  } catch (error) {
    logger.error('Failed to upload image', { error });
    res.status(500).json({ message: 'Failed to upload image' });
  }
};

/**
 * @swagger
 * /api/images:
 *   get:
 *     tags:
 *       - Images
 *     summary: Get user images
 *     description: Get list of images uploaded by the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user images
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   filename:
 *                     type: string
 *                   url:
 *                     type: string
 *                   thumbnailUrl:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
export const getUserImages = async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user.userId;
    
    // Get user's images from database
    const images = await prisma.image.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    const formattedImages = images.map(image => ({
      id: image.id,
      filename: image.filename,
      url: image.originalUrl,
      thumbnailUrl: image.thumbnailUrl,
      createdAt: image.createdAt
    }));
    
    res.status(200).json(formattedImages);
  } catch (error) {
    logger.error('Failed to get user images', { error });
    res.status(500).json({ message: 'Failed to get user images' });
  }
};

/**
 * @swagger
 * /api/images/{id}:
 *   delete:
 *     tags:
 *       - Images
 *     summary: Delete an image
 *     description: Delete an image uploaded by the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the image to delete
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - User doesn't own this image
 *       404:
 *         description: Image not found
 *       500:
 *         description: Server error
 */
export const deleteImage = async (req: Request, res: Response) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userId = req.user.userId;
    const imageId = req.params.id;
    
    // Find the image
    const image = await prisma.image.findUnique({
      where: { id: imageId }
    });
    
    // Check if image exists
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    // Check if user owns the image
    if (image.userId !== userId) {
      return res.status(403).json({ message: 'You do not have permission to delete this image' });
    }
    
    // Extract S3 keys from URLs
    const getKeyFromUrl = (url: string) => {
      const parts = url.split('/');
      return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    };
    
    // Delete from S3
    try {
      await s3Service.deleteFile(getKeyFromUrl(image.originalUrl));
      if (image.thumbnailUrl) {
        await s3Service.deleteFile(getKeyFromUrl(image.thumbnailUrl));
      }
    } catch (error) {
      logger.error('Failed to delete image files from S3', { error, imageId });
      // Continue with database deletion anyway
    }
    
    // Delete from database
    await prisma.image.delete({
      where: { id: imageId }
    });
    
    logger.info(`Image deleted successfully`, { imageId, userId });
    res.status(200).json({ message: 'Image deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete image', { error });
    res.status(500).json({ message: 'Failed to delete image' });
  }
};
