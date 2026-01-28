import type {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Readable } from 'stream';
import * as wav from 'wav';
import type { Server } from 'ws';
import { S3Service } from '../services/s3.service';
import { DBService } from '../services/db.service';

@WebSocketGateway({
  transports: ['websocket'],
  cors: true,
  namespace: 'audio',
  path: '/save-audio',
})
export class AudioGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  uploadDir = '';
  private wavFileWriters: Record<string, wav.FileWriter> = {};
  constructor(private s3Service: S3Service, private dbService: DBService) {
    this.uploadDir = process.env.AUDIO_UPLOAD_DIR || join('public', 'audios');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  afterInit(_: Server) {
    console.log('init');
  }
  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
    // when user disconnects immediately wrap up the audio stream and delete the writer
    this.handleCloseSocket(client);
  }
  @SubscribeMessage('start-recording')
  handleStartRecording(client: Socket) {
    const audioFileName = client.handshake.query.audioFileName as string;
    console.log(audioFileName);
    const audioSettings: { sampleRate: number; channelCount: number } =
      JSON.parse((client.handshake.query.settings as string) ?? 'false') ?? {
        sampleRate: 44100,
        channelCount: 2,
      };
    try {
      const existedWavFile = join(this.uploadDir, audioFileName + '.wav');
      // Audio File writer
      this.wavFileWriters[audioFileName] = new wav.FileWriter(existedWavFile, {
        format: 1, // PCM
        channels: audioSettings.channelCount, // Stereo
        sampleRate: audioSettings.sampleRate,
      });
    } catch (e) {
      console.log(e);
      // handle exception
    }
  }
  @SubscribeMessage('recording')
  handleAudioData(client: Socket, payload: ArrayBuffer) {
    try {
      const audioFileName = client.handshake.query.audioFileName as string;
      const buffer = Buffer.from(payload);
      const readable = new Readable();
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      readable._read = () => { }; // _read is required but you can noop it
      readable.push(buffer);
      readable.push(null);
      readable.pipe(this.wavFileWriters[audioFileName], {
        end: false,
      });
    } catch (e) { }
  }
  @SubscribeMessage('stop-recording')
  async handleStopRecording(client: Socket) {
    console.log('client disconnected');
    const audioFile = client.handshake.query.audioFileName as string;
    client.emit('recording-stopped', audioFile);
    await this.handleCloseSocket(client);
    setTimeout(() => {
      client.disconnect();
    }, 2000);
  }

  private async handleCloseSocket(client: Socket) {
    try {
      const audioFileName = client.handshake.query.audioFileName as string;
      this.wavFileWriters[audioFileName]?.end();
      delete this.wavFileWriters[audioFileName];
      await this.dbService.createAudioRecord({
        filename: audioFileName,
        fileFormat: 'wav',
        length: 0,
      });
      const fileName = `${audioFileName}.wav`
      await this.s3Service.uploadFile(
        fileName,
        join(this.uploadDir, fileName)
      )
    } catch (e) {
      console.error('Error in handleCloseSocket:', e);
    }
  }
}
