import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AudioGateway } from './websocket-gateways/audio/audio.gateway';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { S3Service } from './websocket-gateways/services/s3.service';
import { PrismaService } from './prisma.service';
import { DBService } from './websocket-gateways/services/db.service';
import { createKeyv } from '@keyv/redis';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule,
    CacheModule.registerAsync({
      useFactory: async () => ({
        stores: [createKeyv(`redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`)],
        ttl: 60 * 1000,
      }),
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AudioGateway,S3Service,PrismaService,DBService, {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },],
})
export class AppModule {}
