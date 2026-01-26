import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { RecordingState } from "./audio-lib/WebsocketManager";
import { useRecordAudio } from "./hooks/record-audio";
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";

function App() {
  const {
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    recordingState,
    audioURL,
    audioFile,
  } = useRecordAudio();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioName, setAudioName] = useState("");
  const [transcription, setTrancription] = useState('');
  
  // generate random audio name
  useEffect(() => {
    setAudioName(uuidv4());
  }, []);

  useEffect(() => {
    if (audioURL && audioRef.current) {
      audioRef.current.src = audioURL;
    }
  }, [audioURL, audioRef]);

  const getTranscription = useCallback(()=>{
    if(!audioURL){
      return;
    }
    axios.post(process.env.REACT_APP_AUDIO_TRANSCRIBER_URL+'transcribe-audio',{file:audioFile}).then(data=>{
      const response = data.data;
      if(response){
        setTrancription(response);
      }
    })
  },[audioURL]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-400 to-blue-500 text-white">
      <header className="py-6 bg-gradient-to-r from-white/20 to-white/30 shadow-md text-center">
        <h1 className="text-4xl font-extrabold">🎤 Audio Recorder</h1>
      </header>

      <div className="flex justify-center items-center mt-12 space-x-4">
        {recordingState === RecordingState.IDEAL ? (
          <button
            className="bg-green-500 hover:bg-green-700 transition-colors duration-300 ease-in-out text-white font-bold py-3 px-6 rounded-full shadow-lg transform hover:scale-105"
            onClick={() => startRecording(audioName)}
          >
            Start Recording
          </button>
        ) : recordingState === RecordingState.RUNNING ? (
          <>
            <button
              className="bg-yellow-500 hover:bg-yellow-700 transition-colors duration-300 ease-in-out text-white font-bold py-3 px-6 rounded-full shadow-lg transform hover:scale-105"
              onClick={pauseRecording}
            >
              Pause Recording
            </button>
            <button
              className="bg-red-500 hover:bg-red-700 transition-colors duration-300 ease-in-out text-white font-bold py-3 px-6 rounded-full shadow-lg transform hover:scale-105 ml-4"
              onClick={stopRecording}
            >
              Stop Recording
            </button>
          </>
        ) : (
          <button
            className="bg-yellow-500 hover:bg-yellow-700 transition-colors duration-300 ease-in-out text-white font-bold py-3 px-6 rounded-full shadow-lg transform hover:scale-105"
            onClick={resumeRecording}
          >
            Resume Recording
          </button>
        )}
      </div>

    

      {audioURL ? (
        <div className="flex flex-col items-center space-y-4 mt-8">
          <audio
            src={audioURL}
            controls={true}
            className="w-full max-w-md mx-auto border border-white/50 p-4 rounded-lg bg-white text-black shadow-lg"
          ></audio>
          <button
          onClick={getTranscription}
            className="bg-blue-500 hover:bg-blue-700 transition-colors duration-300 ease-in-out text-white font-bold py-2 px-4 rounded-full shadow-lg transform hover:scale-105"
          >
            Transcribe
          </button>
        </div>
      ) : null}

      {transcription && (
        <div className="my-8 bg-white text-black p-6 rounded-lg shadow-md mx-auto w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-2 text-center">Transcription</h2>
          <p className="text-lg">{transcription}</p>
        </div>
      )}

      <footer className="py-6 mt-auto bg-gradient-to-r from-white/20 to-white/30 shadow-md text-center">
        <p className="text-gray-200 text-sm">
          &copy; Tek Raj Pant {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

export default App;
