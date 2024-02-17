import { useEffect, useRef } from "react";
import { WebsocketManager } from "../audio-lib/WebsocketManager";

export const useRecordAudio = () => {
  const webSocketManager = useRef<WebsocketManager>();
  const onError = (status: string, message: string) => {
    console.log({ status, message });
  };
  const stopRecording = () => {
    if (webSocketManager.current) {
      webSocketManager.current?.stop();
      webSocketManager.current = undefined;
    }
  };
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    const websocketInstance = new WebsocketManager();
    websocketInstance.setQueryParams({ audioFileName: "high-quality-audio" });
    websocketInstance.setOnError(onError);
    websocketInstance.start("");
    webSocketManager.current = websocketInstance;
  };
  const pauseAudio = () => {
    if (webSocketManager.current) {
      webSocketManager.current?.pause();
    }
  };
  const resumeAudio = () => {
    if (webSocketManager.current) {
      webSocketManager.current?.resume();
    }
  };
  return {
    startRecording,
    pauseAudio,
    resumeAudio,
  };
};
