import { IBlobEvent, IMediaRecorder, MediaRecorder, register } from 'extendable-media-recorder';
import { connect } from 'extendable-media-recorder-wav-encoder';
/* to define custom encoders and
here we are using extendable-media-recorder-wav-encoder package
*/
(async () => {
    await register(await connect());
})();
export class AudioRecorder {
    isPaused = false;
    private em: DocumentFragment;
    private recorder?: IMediaRecorder;
    constructor(private stream: MediaStream) {
        this.em = document.createDocumentFragment();
    }
    pause(): void {
        this.isPaused = true;
        this.recorder?.pause();
    }

    resume(): void {
        this.isPaused = false;
        this.recorder?.resume();
    }
    async start(timeslice = 1000) {
        try {
           
            this.recorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/wav',
            });
            this.recorder.addEventListener('dataavailable', (e: IBlobEvent) => {
               /*
                In each timeslice we will get the data and the e.data is the AudioBuffer
                Send actual data if not paused, if paused send empty ArrayBuffer                
              */ 
               const event: any = new Event('dataavailable');
                event.data = this.isPaused ? new ArrayBuffer(0) : e.data;
                this.em.dispatchEvent(event);
            });
            this.recorder.start(timeslice);
        } catch (e) {
              // we can send error event if something went wrong here
              const event: any = new Event('error');
              event.data = 'error message';
              this.em.dispatchEvent(event);
            console.log(e);
        }
    }

    stop() {
// on stop stop all audio tracks
        this.recorder?.stop();
        this.stream?.getAudioTracks().forEach((track) => {
            this.stream?.removeTrack(track);
        });
        this.stream?.getAudioTracks().forEach((track) => {
            this.stream?.removeTrack(track);
        });
    }
  
    addEventListener(event: string, data: any) {
        this.em.addEventListener(event, data);
    }

    removeEventListener(event: string, callback: any) {
        this.em.removeEventListener(event, callback);
    }
    // disptach events
    dispatchEvent(event: Event) {
        this.em.dispatchEvent(event);
    }
}