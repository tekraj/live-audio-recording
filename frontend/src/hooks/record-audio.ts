import { useEffect, useRef, useState } from "react";
import { RecordingState, WebsocketManager } from "../audio-lib/WebsocketManager";
import { audioService } from "../services/audioService";

export const useRecordAudio = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDEAL);
  const webSocketManager = useRef<WebsocketManager>();
  const [audioURL,setAudioURL] = useState('');
  const [audioFile,setAudioFile] = useState('');
  const onError = (status: string, message: string) => {
    console.log({ status, message });
  };

  const onData = (event: string,message: string)=>{
    if(event==='audio-file'){
      setAudioFile(message);
      setAudioURL(audioService.getAudioFileUrl(message,'wav'));
    }
  }
  const stopRecording = () => {
    if (webSocketManager.current) {
      webSocketManager.current?.stop();
      webSocketManager.current = undefined;
      setRecordingState(RecordingState.IDEAL);
    }
  };
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async (audioFileName: string) => {
    const websocketInstance = new WebsocketManager();
    websocketInstance.setQueryParams({ audioFileName });
    websocketInstance.setOnError(onError);
    websocketInstance.setOnData(onData);
    websocketInstance.start("");
    webSocketManager.current = websocketInstance;
    setRecordingState(RecordingState.RUNNING);
  };
  const pauseRecording = () => {
    if (webSocketManager.current) {
      webSocketManager.current?.pause();
      setRecordingState(RecordingState.PUASED);

    }
  };
  const resumeRecording = () => {
    if (webSocketManager.current) {
      webSocketManager.current?.resume();
      setRecordingState(RecordingState.RUNNING);
    }
  };
  return {
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    recordingState,
    audioURL,
    audioFile,
  };
};
