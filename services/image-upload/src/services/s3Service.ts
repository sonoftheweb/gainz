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
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    // Get S3 configuration from environment variables
    const endpoint = process.env.S3_ENDPOINT || 'http://minio:9000';
    const region = process.env.S3_REGION || 'us-east-1';
    const accessKey = process.env.S3_ACCESS_KEY || 'minioadmin';
    const secretKey = process.env.S3_SECRET_KEY || 'minioadmin';
    this.bucket = process.env.S3_BUCKET || 'gainz-images';

    // Initialize S3 client
    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey
      },
      forcePathStyle: true // Required for MinIO
    });

    logger.info(`S3Service initialized with endpoint: ${endpoint}, bucket: ${this.bucket}`);
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

      await this.s3Client.send(command);

      // Return the URL to the uploaded object
      const endpoint = process.env.S3_ENDPOINT || 'http://minio:9000';
      return `${endpoint}/${this.bucket}/${key}`;
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

      return await getSignedUrl(this.s3Client, command, { expiresIn });
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

      await this.s3Client.send(command);
      logger.info(`File deleted from S3`, { key });
    } catch (error) {
      logger.error('Failed to delete file from S3', { error, key });
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Initialize the bucket if it doesn't exist
   */
  async initializeBucket(): Promise<void> {
    try {
      // Check if bucket exists (implementation would go here)
      // If not, create it
      logger.info(`Bucket initialized: ${this.bucket}`);
    } catch (error) {
      logger.error('Failed to initialize bucket', { error, bucket: this.bucket });
      throw new Error('Failed to initialize bucket');
    }
  }
}

export default new S3Service();
