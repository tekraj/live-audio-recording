import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import * as wav from 'wav';
@WebSocketGateway({
  transports: ['websocket'],
  cors: true,
  namespace: 'audio',
  path: '/save-audio',
})
export class AudioGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  uploadDir = '';
  private wavFileWriters: Record<string, wav.FileWriter> = {};
  constructor() {
    this.uploadDir = path.join(global.__dirname, 'audios');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir);
    }
  }

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
    // when user disconnects immediately wrap up the audio stream and delete the writer
    this.handleCloseSocket(client);
  }
  @SubscribeMessage('startRecording')
  handleStartRecording(client: Socket) {
    const audioFileName = client.handshake.query.audioFileName as string;
    const audioSettings: { sampleRate: number; channelCount: number } =
      JSON.parse((client.handshake.query.settings as string) ?? 'false') ?? {
        sampleRate: 44100,
        channelCount: 2,
      };
    try {
      const existedWavFile = path.join(this.uploadDir, audioFileName + '.wav');
      // Audio File writer
      this.wavFileWriters[audioFileName] = new wav.FileWriter(existedWavFile, {
        format: 1, // PCM
        channels: audioSettings.channelCount, // Stereo
        sampleRate: audioSettings.sampleRate,
      });
    } catch (e) {
      // handle exception
    }
  }
  @SubscribeMessage('audioData')
  handleAudioData(client: Socket, payload: ArrayBuffer) {
    try {
      const audioFileName = client.handshake.query.audioFileName as string;
      const buffer = Buffer.from(payload);
      const readable = new Readable();
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      readable._read = () => {}; // _read is required but you can noop it
      readable.push(buffer);
      readable.push(null);
      readable.pipe(this.wavFileWriters[audioFileName], {
        end: false,
      });
    } catch (e) {}
  }

  @SubscribeMessage('stopRecording')
  handleStopRecording(client: Socket) {
    this.handleCloseSocket(client);
  }

  private handleCloseSocket(client: Socket) {
    const audioFileName = client.handshake.query.audioFileName as string;
    this.wavFileWriters[audioFileName]?.end();
    delete this.wavFileWriters[audioFileName];
  }
}
