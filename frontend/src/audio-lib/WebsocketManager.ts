import { Manager, Socket } from "socket.io-client";
import { AudioRecorder } from "./AudioRecorder";
export enum RecordingState {
  IDEAL = "IDEAL",
  RUNNING = "RUNNING",
  PUASED = "PAUSED",
}

export class WebsocketManager {
  audioRecorder?: AudioRecorder;
  mediaStream?: MediaStream;
  audioSocket?: Socket;
  paused = false;
  audioSocketNameSpace = "/audio";
  webSocketURL = process.env.REACT_APP_AUDIO_SERVER_URL;
  saveAudioPath = "/save-audio";
  queryParams = { audioFileName: "" };
  onFinished?: () => void;
  onError?: (status: string, message: string) => void;
  onData?: (event: string, message: string) => void;
  // we can set any query params here
  setQueryParams({ audioFileName }: { audioFileName: string }) {
    this.queryParams = { audioFileName };
  }
  async start(deviceId: string) {
    const constraints = {
      audio: deviceId ? {
        deviceId: { exact: deviceId },
        echoCancellation: false,
        noiseSuppression: false,
      }:{
         echoCancellation: false,
        noiseSuppression: false,
      },
    };
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioRecorder = new AudioRecorder(this.mediaStream);
      const audioSocketManager = new Manager(this.webSocketURL, {
        query: {
          ...this.queryParams,
        },
        transports: ["websocket"],
        path: this.saveAudioPath,
        timeout: 200000,
      });
      this.audioSocket = audioSocketManager.socket(this.audioSocketNameSpace, {
        auth: {
          authorization: "authorization key",
        },
      });
      this.audioSocket.on("connect", () => {});

      this.audioSocket.on("disconnect", (e) => {});
      this.audioSocket.on("error", (e) => {
        this.handleError(e.status, e.message);
      });
      this.audioSocket.on('recording-stopped',(audioFile)=>{
        if(this.onData){
          this.onData('audio-file',audioFile);
        }
      });
      this.audioRecorder.addEventListener("dataavailable", (data: any) => {
        this.audioSocket?.emit("recording", data.data);
      });
      this.audioRecorder.start();
      // send start recording command
      this.audioSocket.emit("start-recording", "start");
    } catch (e) {
      console.log(e);
      // handle error here
    }
  }
  pause() {
    this.audioRecorder?.pause();
    this.paused = true;
  }
  resume() {
    this.paused = false;
    this.audioRecorder?.resume();
  }
  stop() {
    try {
      this.audioSocket?.emit("stop-recording", "end");
      this.stopAllMicrophoneInstances();
      this.audioSocket = undefined;
    } catch (e) {
      console.log(e);
    }
    if (this.audioRecorder) {
      this.audioRecorder.stop();
      this.audioRecorder = undefined;
    }
  }

  stopAllMicrophoneInstances() {
    if (this.audioRecorder) {
      this.audioRecorder.stop();
      this.audioRecorder = undefined;
    }
    if (this.mediaStream !== null) {
      this.mediaStream?.getTracks().forEach(function (track) {
        track.stop();
      });
      this.mediaStream = undefined;
    }
  }
  setOnData(onData: (event: string, message: string) => void) {
    this.onData = onData;
  }
  setOnError(onError: (status: string, message: string) => void) {
    this.onError = onError;
  }
  handleError(status: string, message: string) {
    if (this.onError) {
      this.onError(status, message);
    }
  }
  
}
