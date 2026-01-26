import { Controller, Get, Param,StreamableFile } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('audios/:filename')
  getAudioFile(@Param('filename') audioFile: string ){
    const stream = this.appService.getAudioStream(audioFile);
    if (!stream) {
      return 'File not found';
    }
    return new StreamableFile(stream, {
      type: 'audio/wav', 
      disposition: 'inline',
    });
  }
}
