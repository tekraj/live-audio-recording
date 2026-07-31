import { Controller, Get, Param, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { DBService } from './websocket-gateways/services/db.service';
import { S3Service } from './websocket-gateways/services/s3.service';
import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';
import type { Response } from 'express';

@Controller()
export class AppController {
  
  constructor(private readonly appService: AppService,private dbService: DBService, private s3Service: S3Service) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get(['audios/:filename', 'app/audio-recordings/:filename'])
  async getAudioFile(@Param('filename') audioFile: string, @Res() res: Response) {
    const uploadDir = process.env.AUDIO_UPLOAD_DIR || join('public', 'audios');
    const filePath = join(uploadDir, audioFile);

    if (existsSync(filePath) && statSync(filePath).isFile()) {
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Content-Disposition', `inline; filename="${audioFile}"`);
      createReadStream(filePath).pipe(res);
      return;
    }

    const signedUrl = await this.s3Service.getFileUrl(audioFile);
    if (signedUrl) {
      res.redirect(signedUrl);
      return;
    }

    res.status(404).send('Audio not found');
  }

  @Get('audio-records')
  async listAudioRecords() {
    const audios = await this.dbService.listAudioRecords();
    const audiosWithUrl = await Promise.all(audios.map(async(audio)=>{
      const fileName = `${audio.filename}.${audio.fileFormat}`;
      const uploadDir = process.env.AUDIO_UPLOAD_DIR || join('public', 'audios');
      const filePath = join(uploadDir, fileName);
      const url = existsSync(filePath)
        ? `/audios/${fileName}`
        : await this.s3Service.getFileUrl(fileName);
      return {...audio, url};
    }));
    return audiosWithUrl;
  }
}
