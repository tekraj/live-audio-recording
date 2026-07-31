# Product Overview

## Purpose
Live Radio is a full-stack real-time audio recording and broadcasting application. It enables browser-based microphone capture, live streaming of audio to a backend, persistent storage, and radio-style live playback for connected listeners.

## Key Features
- **Live Audio Recording**: Capture microphone input in the browser and stream it in real-time to the backend via WebSocket
- **Radio Broadcast Mode**: Recorded audio is simultaneously broadcast to all connected radio listeners as it is being recorded
- **Audio Persistence**: Recorded sessions are saved as WAV files locally or uploaded to AWS S3
- **Audio Playback**: Stored recordings are listed and playable directly in the browser
- **Audio Transcription**: Optional speech-to-text transcription via OpenAI Whisper (Python Flask service)
- **NATS JetStream Consumer**: Separate live-transcription service consumes audio chunk events from a NATS message stream
- **Dual Frontend**: Separate React apps — one for recording (`frontend/`) and one for radio listening (`radio/`)

## Target Users
- Developers building real-time audio streaming pipelines
- Teams needing a reference architecture for WebSocket-based audio capture and broadcast
- Users who want to record, store, and transcribe audio sessions from the browser

## Use Cases
1. Record a browser microphone session → saved as WAV → stored locally or in S3
2. Listen live to an ongoing recording session via the radio frontend
3. Transcribe a recorded audio file using Whisper
4. Process audio chunk events asynchronously via NATS JetStream consumers
