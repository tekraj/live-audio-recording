import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect,  JSONCodec, Codec,NatsConnection } from 'nats';
import { 
  jetstream, 
  JetStreamClient, 
  JetStreamManager, 
  jetstreamManager,
  StorageType,
  DiscardPolicy
} from '@nats-io/jetstream';

@Injectable()
export class NatsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NatsService.name);
  private nc?: NatsConnection;
  private js?: JetStreamClient;
  private jsm?: JetStreamManager;
  private readonly jc: Codec<any> = JSONCodec();

  async onModuleInit() {
    try {
      this.nc = await connect({
        servers: process.env.NATS_URL || 'nats://localhost:4222',
      }) as NatsConnection;

     
      this.js = jetstream(this.nc as any);
      this.jsm = await jetstreamManager(this.nc as any);

      await this.ensureStream();
      this.logger.log('NATS JetStream Publisher initialized');
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
    }
  }

  private async ensureStream() {
    if (!this.jsm) return;

    const streamName = 'AUDIO_EVENTS';
    const subjects = ['audio.chunk.*'];

    try {
      try {
        await this.jsm.streams.info(streamName);
        this.logger.log(`Stream ${streamName} already exists.`);
      } catch (e) {
        // Stream doesn't exist, create it
        await this.jsm.streams.add({
          name: streamName,
          subjects: subjects,
          discard: DiscardPolicy.Old,
          max_msgs: 100000,
          storage: StorageType.File,
        });
        this.logger.log(`Stream ${streamName} created successfully.`);
      }
    } catch (err) {
      this.logger.error(`Error setting up stream ${streamName}:`, err);
    }
  }

  /**
   * Publish audio chunks to a specific subject
   */
  async publishAudioChunk(sessionId: string, payload: any) {
    if (!this.js) {
      throw new Error('JetStream client not initialized');
    }

    const subject = `audio.chunk.${sessionId}`;
    try {
      // The standalone jetstream library publish method
      const ack = await this.js.publish(subject, this.jc.encode(payload));
      return ack;
    } catch (error) {
      this.logger.error(`Failed to publish chunk for session ${sessionId}`, error);
      throw error;
    }
  }

  async onModuleDestroy() {
    if (this.nc) {
      await this.nc.drain(); // Drain is safer than close for publishers
      this.logger.log('NATS connection drained and closed');
    }
  }
}