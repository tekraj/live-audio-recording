import { useEffect, useRef, useState } from "react";
import "./App.css";
import { RecordingState } from "./audio-lib/WebsocketManager";
import { useRecordAudio } from "./hooks/record-audio";
import { v4 as uuidv4 } from 'uuid';

function App() {
  const {
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    recordingState,
    audioURL,
  } = useRecordAudio();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioName, setAudioName] = useState("");

  // generate random audio name
  useEffect(() => {
    setAudioName(uuidv4());
  }, []);
  useEffect(() => {
    if (audioURL && audioRef.current) {
      audioRef.current.src = audioURL;
    }
  }, [audioURL, audioRef]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-between">
      <header className="py-4 bg-white text-center">
        <h1 className="text-3xl font-bold">Audio Recorder</h1>
      </header>
      <div className="flex justify-center items-center my-8">
        {recordingState === RecordingState.IDEAL ? (
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={()=>{
              startRecording(audioName);
            }}
          >
            Start Recording
          </button>
        ) : recordingState === RecordingState.RUNNING ? (
          <>
            <button
              className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
              onClick={pauseRecording}
            >
              Pause Recording
            </button>
            <button
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded ml-4"
              onClick={stopRecording}
            >
              Stop Recording
            </button>
          </>
        ) : (
          <button
            className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
            onClick={resumeRecording}
          >
            Resume Recording
          </button>
        )}
      </div>

      {audioURL && (
        <audio controls className="my-8 mx-auto" ref={audioRef}>
          Your browser does not support the audio element.
        </audio>
      )}
      <footer className="py-4 bg-white text-center">
        <p className="text-gray-500">
          &copy; Tek Raj Pant {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

export default App;
