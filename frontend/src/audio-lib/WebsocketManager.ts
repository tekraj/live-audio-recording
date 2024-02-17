import { Manager, Socket } from "socket.io-client";
import { AudioRecorder } from "./AudioRecorder";

export class WebsocketManager {
  audioRecorder?: AudioRecorder;
  mediaStream?: MediaStream;
  audioSocket?: Socket;
  paused = false;
  audioSocketNameSpace = "audio";
  webSocketURL = "ws://localhost:3000";
  saveAudioPath = "save-audio";
  queryParams = { audioFileName: "" };
  onFinished?: () => void;
  onError?: (statu: string, message: string) => void;
  onAudioBlobReceived?: (data: any) => void;

  // we can set any query params here
  setQueryParams({ audioFileName }: { audioFileName: string }) {
    this.queryParams = { audioFileName };
  }
  async start(deviceId: string) {
    const constraints = {
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: false,
        noiseSuppression: false,
      },
    };
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.audioRecorder = new AudioRecorder(this.mediaStream);
      const audioSocketManager = new Manager(this.webSocketURL, {
        query: {
         ...this.queryParams
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
      this.audioRecorder.addEventListener("dataavailable", (data: any) => {
        this.audioSocket?.emit("recording", data);
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
      this.audioSocket?.disconnect();
      this.audioSocket?.emit("end-recording", "end");
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

  setOnError(onError: (status: string, message: string) => void) {
    this.onError = onError;
  }
  handleError(status: string, message: string) {
    if (this.onError) {
      this.onError(status, message);
    }
  }
}
