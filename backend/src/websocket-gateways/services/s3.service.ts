import { Injectable, Inject } from '@nestjs/common';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream, existsSync, statSync, unlinkSync } from 'fs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { join } from 'path';

@Injectable()
export class S3Service {
  private s3Client?: S3Client;
  private bucket: string;
  private readonly enabled: boolean;

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {
    this.bucket = process.env.AWS_S3_BUCKET_NAME || 'audio';
    this.enabled = process.env.USE_S3 === 'true';
    if (this.enabled) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
      });
    }
  }

  async uploadFile(fileName: string, filePath: string): Promise<void> {
    if (!this.enabled) {
      console.log(`S3 disabled; keeping local audio file at ${filePath}`);
      return;
    }

    const body = createReadStream(filePath);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: `audios/${fileName}`,
      Body: body,
    });

    await this.s3Client!.send(command);
    unlinkSync(filePath);
    console.log(`${fileName} uploaded to S3 and local file removed.`);
  }

  async getFileUrl(fileName: string): Promise<string> {
    if (!this.enabled) {
      const uploadDir = process.env.AUDIO_UPLOAD_DIR || join('public', 'audios');
      const filePath = join(uploadDir, fileName);
      if (existsSync(filePath) && statSync(filePath).isFile()) {
        return filePath;
      }
      return '';
    }

    try {
      const cachedUrl = await this.cacheManager.get<string>(fileName);
      if (cachedUrl) {
        return cachedUrl;
      }
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: `audios/${fileName}`,
      });
      const url = await getSignedUrl(this.s3Client!, command, { expiresIn: 3600 });

      await this.cacheManager.set(fileName, url, 3600);
      return url;
    } catch (e) {
      console.error('Error getting file URL from S3:', e);
      return '';
    }
  }
}