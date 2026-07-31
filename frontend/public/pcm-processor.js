// public/pcm-processor.js

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // 1-second ring buffer capacity at 44.1kHz / 48kHz
    this.bufferSize = 48000;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.readIndex = 0;

    // Receive raw PCM chunks sent from the main thread via postMessage
    this.port.onmessage = (event) => {
      const inputBuffer = event.data; // Float32Array of samples
      for (let i = 0; i < inputBuffer.length; i++) {
        this.buffer[this.writeIndex] = inputBuffer[i];
        this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const outputChannel = output[0];

    if (!outputChannel) return true;

    for (let i = 0; i < outputChannel.length; i++) {
      if (this.readIndex !== this.writeIndex) {
        outputChannel[i] = this.buffer[this.readIndex];
        this.readIndex = (this.readIndex + 1) % this.bufferSize;
      } else {
        // Underflow: Buffer is empty, output silence (0.0)
        outputChannel[i] = 0;
      }
    }

    return true; // Keep the processor active
  }
}

registerProcessor('pcm-processor', PCMProcessor);