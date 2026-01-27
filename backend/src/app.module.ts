import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioGateway } from './websocket-gateways/audio/audio.gateway';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { S3Service } from './websocket-gateways/services/s3.service';
import { PrismaService } from './prisma.service';
import { DBService } from './websocket-gateways/services/db.service';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  controllers: [AppController],
  providers: [AppService, AudioGateway,S3Service,PrismaService,DBService],
})
export class AppModule {}
