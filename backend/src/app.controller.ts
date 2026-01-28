import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { DBService } from './websocket-gateways/services/db.service';
import { S3Service } from './websocket-gateways/services/s3.service';

@Controller()
export class AppController {
  
  constructor(private readonly appService: AppService,private dbService: DBService, private s3Service: S3Service) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('audios/:filename')
  async getAudioFile(@Param('filename') audioFile: string ){
    const audioUrl = await this.s3Service.getFileUrl(audioFile);
    return audioUrl;
  }

  @Get('audio-records')
  async listAudioRecords() {
    const audios = await this.dbService.listAudioRecords();
    const audiosWithUrl = await Promise.all(audios.map(async(audio)=>{
      const url = await this.s3Service.getFileUrl(`${audio.filename}.${audio.fileFormat}`);
      return {...audio, url};
    }));
    return audiosWithUrl;
  }
}
