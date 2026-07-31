import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { v4 as uuidv4 } from 'uuid';
import axios from "axios";
import { AudioTable, AudioTableRef } from "./components/AudioTable";
import { RadioAudioPlayer } from "./audio-lib/RadioAudioPlayer";

function App() {
  const audioURL = null;
  const audioFile = null;
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioTableRef = useRef<AudioTableRef>(null);
  const radioPlayerRef = useRef<RadioAudioPlayer | null>(null);
  const [transcription, setTrancription] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  useEffect(() => {
    return () => {
      radioPlayerRef.current?.disconnect();
      radioPlayerRef.current = null;
    };
  }, []);

 const handleToggleListening = async () => {
  if (isListening) {
    await radioPlayerRef.current?.disconnect();
    radioPlayerRef.current = null;
    setIsListening(false);
    return;
  }

  const player = new RadioAudioPlayer();
  radioPlayerRef.current = player;
  await player.connect();
  setIsListening(true);
};

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

      <div className="flex justify-center items-center mt-12">
        <button
          className={`${isListening ? 'bg-purple-700 hover:bg-purple-800' : 'bg-indigo-600 hover:bg-indigo-700'} transition-colors duration-300 ease-in-out text-white font-bold py-3 px-6 rounded-full shadow-lg transform hover:scale-105`}
          onClick={handleToggleListening}
        >
          {isListening ? 'Stop Listening' : 'Listen Radio'}
        </button>
      </div>

      {transcription && (
        <div className="my-8 bg-white text-black p-6 rounded-lg shadow-md mx-auto w-full max-w-2xl">
          <h2 className="text-2xl font-bold mb-2 text-center">Transcription</h2>
          <p className="text-lg">{transcription}</p>
        </div>
      )}

      <div className="my-8 mx-auto w-full max-w-4xl">
        <h2 className="text-2xl font-bold mb-4 text-center">Recorded Audios</h2>
        <AudioTable ref={audioTableRef} />
      </div>
      <footer className="py-6 mt-auto bg-gradient-to-r from-white/20 to-white/30 shadow-md text-center">
        <p className="text-gray-200 text-sm">
          &copy; Tek Raj Pant {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

export default App;
