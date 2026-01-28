import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { audioService, AudioRecord } from '../services/audioService';

export interface AudioTableRef {
  refresh: () => void;
}

export const AudioTable = forwardRef<AudioTableRef>((_, ref) => {
  const [audioRecords, setAudioRecords] = useState<AudioRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    fetchAudioRecords();
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: fetchAudioRecords,
  }));

  const fetchAudioRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await audioService.listAudioRecords();
      setAudioRecords(records);
    } catch (err) {
      setError('Failed to fetch audio records');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAudioPlay = (recordId: string) => {
    // Pause all other audio players
    Object.keys(audioRefs.current).forEach((key) => {
      if (key !== recordId) {
        audioRefs.current[key].pause();
      }
    });
    setCurrentPlayingId(recordId);
  };

  const handleAudioPause = () => {
    setCurrentPlayingId(null);
  };

  if (loading) {
    return <div className="p-4">Loading audio records...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        {error}
        <button
          onClick={fetchAudioRecords}
          className="ml-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Audio Records</h2>
        <button
          onClick={fetchAudioRecords}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {audioRecords.length === 0 ? (
        <div className="text-gray-500 p-4">No audio records found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 p-3 text-left">Filename</th>
                <th className="border border-gray-300 p-3 text-left">Created At</th>
                <th className="border border-gray-300 p-3 text-left">Duration</th>
                <th className="border border-gray-300 p-3 text-center">Player</th>
              </tr>
            </thead>
            <tbody>
              {audioRecords.map((record, index) => (
                <tr key={record.id || index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-3">{record.filename}</td>
                  <td className="border border-gray-300 p-3">
                    {new Date(record.createdAt).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 p-3">
                    {record.duration ? `${record.duration}s` : 'N/A'}
                  </td>
                  <td className="border border-gray-300 p-3 text-center">
                    <audio
                      ref={(el) => {
                        if (el && record.id) audioRefs.current[record.id] = el;
                      }}
                      controls
                      className="h-10"
                      src={record.url}
                      onPlay={() => handleAudioPlay(record.id)}
                      onPause={handleAudioPause}
                    >
                      Your browser does not support the audio element.
                    </audio>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
