import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import logger from '../utils/logger';

class S3Service {
  private s3ClientInternal: S3Client;
  private s3ClientPublic: S3Client; // Separate client for public URL generation
  private bucket: string;
  private internalEndpoint: string;
  private publicEndpoint: string;

  constructor() {
    // Get S3 configuration from environment variables
    this.internalEndpoint = process.env.S3_ENDPOINT || 'http://minio:9000';
    // Replace 'minio' with 'localhost' for public-facing URLs
    this.publicEndpoint = this.internalEndpoint.replace('minio', 'localhost');
    
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKey = process.env.S3_ACCESS_KEY || 'minioadmin';
    const secretKey = process.env.S3_SECRET_KEY || 'minioadmin';
    this.bucket = process.env.S3_BUCKET || 'gainz-images';

    // Initialize S3 clients - one for internal operations, one for public URL generation
    this.s3ClientInternal = new S3Client({
      endpoint: this.internalEndpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey
      },
      forcePathStyle: true // Required for MinIO
    });
    
    // Create a separate client for public URL generation
    this.s3ClientPublic = new S3Client({
      endpoint: this.publicEndpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey
      },
      forcePathStyle: true // Required for MinIO
    });

    logger.info(`S3Service initialized with internal endpoint: ${this.internalEndpoint}, public endpoint: ${this.publicEndpoint}, bucket: ${this.bucket}`);
  }
  
  /**
   * Verify S3 connection and initialize bucket if needed
   * @returns Promise that resolves when connection is verified
   */
  public async checkConnection(): Promise<void> {
    return this.initializeBucket();
  }
  
  /**
   * Initialize the S3 bucket if it doesn't exist
   * @private
   */
  private async initializeBucket(): Promise<void> {
    try {
      // Import here to avoid circular dependency
      const { HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
      
      try {
        // Check if bucket exists
        await this.s3ClientInternal.send(new HeadBucketCommand({ Bucket: this.bucket }));
        logger.info(`Bucket ${this.bucket} already exists`);
      } catch (error: any) {
        // If bucket doesn't exist, create it
        if (error.name === 'NotFound' || error.name === 'NoSuchBucket') {
          await this.s3ClientInternal.send(new CreateBucketCommand({ Bucket: this.bucket }));
          logger.info(`Created bucket ${this.bucket}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Failed to initialize bucket', { error, bucket: this.bucket });
    }
  }

  /**
   * Upload a file to S3
   * @param key Object key (path)
   * @param body File content
   * @param contentType MIME type
   * @returns URL of the uploaded object
   */
  async uploadFile(key: string, body: Buffer | Readable, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      });

      await this.s3ClientInternal.send(command);

      // Return a signed URL to the uploaded object instead of a direct URL
      return this.getSignedUrl(key, 604800); // 7 days expiration
    } catch (error) {
      logger.error('Failed to upload file to S3', { error, key });
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Generate a pre-signed URL for temporary access to an object
   * @param key Object key (path)
   * @param expiresIn Expiration time in seconds (default: 1 hour)
   * @returns Pre-signed URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      // Generate the signed URL using the public endpoint client directly
      // This ensures the signature is calculated correctly for the hostname that will be used
      const publicUrl = await getSignedUrl(this.s3ClientPublic, command, { expiresIn });
      logger.debug(`Generated public URL: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL', { error, key });
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * Delete a file from S3
   * @param key Object key (path)
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.s3ClientInternal.send(command);
      logger.info(`File deleted from S3`, { key });
    } catch (error) {
      logger.error('Failed to delete file from S3', { error, key });
      throw new Error('Failed to delete file');
    }
  }


}

export default new S3Service();
