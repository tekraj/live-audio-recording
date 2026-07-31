import { Manager, Socket } from 'socket.io-client';

// 1. AudioWorkletProcessor handling 48kHz Interleaved Stereo PCM [L, R, L, R, ...]
const pcmProcessorCode = `
class StereoPCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 2-second ring buffer capacity at 48kHz stereo (48000 frames * 2 channels = 96000 samples)
    this.capacity = 96000;
    this.buffer = new Float32Array(this.capacity);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.availableSamples = 0;

    this.port.onmessage = (event) => {
      // Receive Float32Array transferred from the main thread
      const input = new Float32Array(event.data);
      for (let i = 0; i < input.length; i++) {
        this.buffer[this.writeIndex] = input[i];
        this.writeIndex = (this.writeIndex + 1) % this.capacity;
      }
      this.availableSamples = Math.min(this.capacity, this.availableSamples + input.length);
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const leftChannel = output[0];
    const rightChannel = output[1] || output[0]; // Fallback to mono if system output is single-channel
    const frameCount = leftChannel.length; // Standard 128 frames per render quantum

    // Require enough available samples for both stereo channels (frameCount * 2)
    // Pre-buffers ~42ms (2048 samples) to avoid underrun clicking/glitches
    if (this.availableSamples < frameCount * 2) {
      leftChannel.fill(0);
      if (output[1]) rightChannel.fill(0);
      return true;
    }

    // De-interleave the buffer: sample 0 -> Left, sample 1 -> Right
    for (let i = 0; i < frameCount; i++) {
      leftChannel[i] = this.buffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.capacity;

      rightChannel[i] = this.buffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.capacity;

      this.availableSamples -= 2;
    }

    return true;
  }
}

registerProcessor('pcm-processor', StereoPCMProcessor);
`;

export class RadioAudioPlayer {
  private socket?: Socket;
  private readonly namespace = '/audio';
  private readonly path = '/api/radio-audio/';
  private readonly url = process.env.REACT_APP_AUDIO_SERVER_URL;

  private audioContext?: AudioContext;
  private workletNode?: AudioWorkletNode;
  private workletBlobUrl?: string;
  private isModuleLoaded = false;

  async connect() {
    if (this.socket?.connected) return;

    // 1. Initialize AudioContext matched directly to your 48kHz backend stream
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 48000 });
    }

    // Resume AudioContext if suspended by browser autoplay policy
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // 2. Load and Register the Audio Worklet Processor
    try {
      if (!this.workletBlobUrl) {
        const blob = new Blob([pcmProcessorCode], { type: 'application/javascript' });
        this.workletBlobUrl = URL.createObjectURL(blob);
      }

      if (!this.isModuleLoaded) {
        await this.audioContext.audioWorklet.addModule(this.workletBlobUrl);
        this.isModuleLoaded = true;
      }

      this.workletNode = new AudioWorkletNode(this.audioContext, 'pcm-processor', {
        outputChannelCount: [2], // Force stereo output channels (Left & Right)
      });
      this.workletNode.connect(this.audioContext.destination);
    } catch (err) {
      console.error('Failed to load AudioWorklet:', err);
      return;
    }

    // 3. Setup Socket connection
    const manager = new Manager(this.url, {
      transports: ['websocket'],
      path: this.path,
      timeout: 200000,
    });

    this.socket = manager.socket(this.namespace);

    this.socket.on('connect', () => {
      this.socket?.emit('join');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Radio websocket connection failed', error);
    });

    // 4. Ingest PCM Audio Chunks
    this.socket.on('audio-chunk', (chunk: ArrayBuffer | Buffer | Uint8Array | string) => {
      const arrayBuffer = this.toArrayBuffer(chunk);

      if (arrayBuffer.byteLength > 0 && this.workletNode) {
        const float32Data = this.convertInt16ToFloat32(arrayBuffer);

        // Zero-copy transfer using ArrayBuffer transferables array
        this.workletNode.port.postMessage(float32Data.buffer, [float32Data.buffer]);
      }
    });
  }

  async disconnect() {
    this.socket?.disconnect();
    this.socket = undefined;

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = undefined;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.audioContext = undefined;
    this.isModuleLoaded = false;

    if (this.workletBlobUrl) {
      URL.revokeObjectURL(this.workletBlobUrl);
      this.workletBlobUrl = undefined;
    }
  }

  /**
   * Safely decodes Int16 Little-Endian PCM data using DataView 
   * to guarantee proper byte alignment across all packet sizes.
   */
  private convertInt16ToFloat32(arrayBuffer: ArrayBuffer): Float32Array {
    const view = new DataView(arrayBuffer);
    const numSamples = Math.floor(arrayBuffer.byteLength / 2);
    const float32Array = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      // Read 16-bit signed integer in Little-Endian format (true)
      const int16 = view.getInt16(i * 2, true);
      float32Array[i] = int16 / 32768.0;
    }

    return float32Array;
  }

  /**
   * Converts various payload formats (ArrayBuffer, TypedArray, base64 String) to ArrayBuffer
   */
  private toArrayBuffer(chunk: ArrayBuffer | Buffer | Uint8Array | string): ArrayBuffer {
    if (chunk instanceof ArrayBuffer) {
      return chunk;
    }

    if (ArrayBuffer.isView(chunk)) {
      return chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as any;
    }

    if (typeof chunk === 'string') {
      const binary = atob(chunk);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    return new ArrayBuffer(0);
  }
}