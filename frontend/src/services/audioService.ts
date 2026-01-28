import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_AUDIO_SERVER_URL;

export interface AudioRecord {
  id: string;
  filename: string;
  createdAt: string;
  duration?: number;
  fileFormat: string;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const audioService = {
  /**
   * Fetch all audio records from the backend
   */
  listAudioRecords: async (): Promise<AudioRecord[]> => {
    try {
      const response = await apiClient.get('/audio-records');
      return response.data;
    } catch (error) {
      console.error('Error fetching audio records:', error);
      throw error;
    }
  },

  /**
   * Get audio file URL
   */
  getAudioFileUrl: (filename: string, fileFormat: string): string => {
    return `${API_BASE_URL}audios/${filename}.${fileFormat}`;
  },

  /**
   * Download audio file
   */
  downloadAudio: async (filename: string, fileFormat: string): Promise<Blob> => {
    try {
      const response = await apiClient.get(`/audios/${filename}.${fileFormat}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading audio:', error);
      throw error;
    }
  },
};
