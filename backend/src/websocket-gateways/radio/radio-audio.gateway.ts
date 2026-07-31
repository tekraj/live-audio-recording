import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

@WebSocketGateway({
  transports: ['websocket'],
  cors: true,
  namespace: 'audio',
  path: '/radio-audio/',
})
export class RadioAudioGateway {
  @WebSocketServer() server: Server;
  private readonly clients = new Set<Socket>();

  handleConnection(client: Socket) {
    this.clients.add(client);
    console.log('Radio client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client);
    console.log('Radio client disconnected:', client.id);
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket) {
    client.emit('joined', { status: 'ready' });
  }

  broadcastAudioChunk(payload: Buffer | ArrayBuffer) {
    const chunk = Buffer.isBuffer(payload)
      ? payload
      : Buffer.from(payload);

    if (chunk.length === 0) {
      return;
    }

    this.server.emit('audio-chunk', chunk);
  }
}
