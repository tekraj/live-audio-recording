import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync,createReadStream } from 'fs';
import { join } from 'path';
@Injectable()
@Injectable()
export class AppService {
  uploadDir = '';
  constructor() {
    // Use mounted audio volume in Docker or public/audios locally
    this.uploadDir = process.env.AUDIO_UPLOAD_DIR || join('public', 'audios');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }
  getHello(): string {
    return 'Hello World!';
  }

  getAudioStream(filename: string) {
    const filePath = join(this.uploadDir, filename);
    if (existsSync(filePath)) {
      const fileStream = createReadStream(filePath);
      return fileStream
    }
    return null;
  }
}
