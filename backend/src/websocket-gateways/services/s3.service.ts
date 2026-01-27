import { Injectable } from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
// import { createReadStream,  unlinkSync } from 'fs';
// import { join } from 'path';
@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  constructor(

  ) {
    this.bucket = process.env.AWS_S3_BUCKET_NAME || 'default-bucket-name';
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'default-access-key-id',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'default-secret-access-key',
      },
    });
  }

  async uploadFile(fileName: string): Promise<void> {
    try {
      // const body = createReadStream(join('public', 'audios', fileName));
      // const command = new PutObjectCommand({
      //   Bucket: this.bucket,
      //   Key: `audios/${fileName}`,
      //   Body: body,
      // });
      // await this.s3Client.send(command);
      // unlinkSync(join('public', 'audios', fileName));
      console.log(fileName+' uploaded to S3');
    } catch (error) {
      console.error(`Error uploading file ${fileName} to S3:`, error);
    }

  }

  async getFileUrl(fileName: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: `audios/${fileName}`,
    });
    await this.s3Client.send(command);
    return `https://${this.bucket}.s3.amazonaws.com/audios/${fileName}`;
  }
}