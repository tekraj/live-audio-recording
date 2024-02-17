import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioGatewayGateway } from './audio-gateway/audio-gateway.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, AudioGatewayGateway],
})
export class AppModule {}
