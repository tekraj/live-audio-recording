// recorder-worklet.ts
export const recorderWorkletCode = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 100ms at 48kHz = 4800 frames. 
    // Stereo = 4800 * 2 = 9600 Int16 samples.
    this.bufferSize = 4800;
    this.leftBuffer = new Float32Array(this.bufferSize);
    this.rightBuffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    
    // Configurable noise threshold (0.001 to 0.05). Adjust based on mic sensitivity.
    this.noiseThreshold = 0.005; 
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const left = input[0];
    const right = input[1] || input[0]; // Mono fallback

    for (let i = 0; i < left.length; i++) {
      this.leftBuffer[this.bufferIndex] = left[i];
      this.rightBuffer[this.bufferIndex] = right[i];
      this.bufferIndex++;

      // When we hit 100ms of accumulated audio
      if (this.bufferIndex >= this.bufferSize) {
        this.flush();
      }
    }

    return true;
  }

  flush() {
    // 1. Calculate RMS (Root Mean Square) to detect if chunk is just background noise
    let sumSquares = 0;
    for (let i = 0; i < this.bufferSize; i++) {
      sumSquares += (this.leftBuffer[i] * this.leftBuffer[i]) + (this.rightBuffer[i] * this.rightBuffer[i]);
    }
    const rms = Math.sqrt(sumSquares / (this.bufferSize * 2));

    // 2. Noise Gate: If volume is below threshold, drop the chunk to save backend processing
    if (rms < this.noiseThreshold) {
      this.bufferIndex = 0; // Reset and wait for next chunk
      return; 
    }

    // 3. Interleave Float32 samples [L, R, L, R...] and convert directly to Int16 ArrayBuffer
    const pcm16 = new Int16Array(this.bufferSize * 2);
    let pcmIndex = 0;

    for (let i = 0; i < this.bufferSize; i++) {
      // Clamp values between -1.0 and 1.0 to prevent clipping noise
      const sL = Math.max(-1, Math.min(1, this.leftBuffer[i]));
      const sR = Math.max(-1, Math.min(1, this.rightBuffer[i]));

      pcm16[pcmIndex++] = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;
      pcm16[pcmIndex++] = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
    }

    // Send zero-copy Int16 ArrayBuffer directly to main thread
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);

    // Reset buffer pointer
    this.bufferIndex = 0;
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
`;

export class AudioRecorder {
  isPaused = false;
  private em: DocumentFragment;
  private audioContext?: AudioContext;
  private sourceNode?: MediaStreamAudioSourceNode;
  private workletNode?: AudioWorkletNode;
  private workletBlobUrl?: string;

  constructor(private stream: MediaStream) {
    this.em = document.createDocumentFragment();
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  async start() {
    try {
      // 1. Create AudioContext aligned to 48kHz
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 48000 });

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 2. Load inline AudioWorklet module
      if (!this.workletBlobUrl) {
        const blob = new Blob([recorderWorkletCode], { type: 'application/javascript' });
        this.workletBlobUrl = URL.createObjectURL(blob);
      }

      await this.audioContext.audioWorklet.addModule(this.workletBlobUrl);

      // 3. Connect Mic Stream -> Worklet
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'recorder-processor', {
        channelCount: 2,
      });

      // 4. Handle incoming 100ms Int16 PCM chunks
      this.workletNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
        // Because of the Worklet Noise Gate, this will ONLY fire when active sound is detected
        const pcmBuffer = this.isPaused ? new ArrayBuffer(0) : event.data;
        if (pcmBuffer.byteLength === 0) return;

        const dataEvent: any = new Event('dataavailable');
        dataEvent.data = pcmBuffer;
        this.em.dispatchEvent(dataEvent);
      };

      this.sourceNode.connect(this.workletNode);
    } catch (e) {
      const errorEvent: any = new Event('error');
      errorEvent.data = e;
      this.em.dispatchEvent(errorEvent);
      console.error('AudioRecorder start failed:', e);
    }
  }

  async stop() {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = undefined;
    }

    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = undefined;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = undefined;
    }

    this.stream?.getAudioTracks().forEach((track) => {
      track.stop();
      this.stream?.removeTrack(track);
    });

    if (this.workletBlobUrl) {
      URL.revokeObjectURL(this.workletBlobUrl);
      this.workletBlobUrl = undefined;
    }
  }

  addEventListener(event: string, callback: EventListener) {
    this.em.addEventListener(event, callback);
  }

  removeEventListener(event: string, callback: EventListener) {
    this.em.removeEventListener(event, callback);
  }

  dispatchEvent(event: Event) {
    this.em.dispatchEvent(event);
  }
}