# Project Structure

## Directory Layout
```
live-radio/
├── backend/                  # NestJS API (port 5000)
│   ├── src/
│   │   ├── adapters/         # Socket.IO adapters (Redis, plain)
│   │   ├── websocket-gateways/
│   │   │   ├── audio/        # AudioGateway: records & saves audio
│   │   │   ├── radio/        # RadioAudioGateway: broadcasts chunks to listeners
│   │   │   └── services/     # S3Service, DBService
│   │   ├── app.module.ts     # Root module wiring
│   │   ├── app.controller.ts # REST: audio file serving, audio-records list
│   │   ├── prisma.service.ts # PrismaClient wrapper
│   │   └── main.ts           # Bootstrap, CORS, static assets
│   ├── prisma/
│   │   └── schema.prisma     # Audio model (MySQL)
│   └── generated/prisma/     # Prisma generated client output
│
├── frontend/                 # React recorder app (port 3000)
│   └── src/
│       ├── audio-lib/        # AudioRecorder.ts, WebsocketManager.ts
│       ├── components/       # AudioTable.tsx (forwardRef, imperative handle)
│       ├── hooks/            # useRecordAudio (recording state machine)
│       └── services/         # audioService.ts (axios API client)
│
├── radio/                    # React radio listener app (port 3001)
│   └── src/
│       ├── audio-lib/        # RadioAudioPlayer.ts (Web Audio API queue)
│       ├── components/       # AudioTable.tsx
│       └── services/         # audioService.ts
│
├── audio-transcription/      # Python Flask + Whisper (port 5555)
│   └── app/
│       ├── server.py         # Flask routes
│       └── TranscribeAudio.py # Whisper model wrapper
│
├── live-transcription/       # Node.js NATS JetStream consumer
│   └── src/index.ts          # Consumes audio.chunk.* subjects
│
├── nginx/
│   └── default.conf          # Reverse proxy routing rules
│
├── lambdas/                  # AWS Lambda functions (student CRUD, login)
├── data/                     # Bind-mounted runtime data (audio, db, redis)
├── docker-compose.yml        # Full service orchestration
└── .env / .env.example       # Environment configuration
```

## Core Components & Relationships

### Audio Recording Flow
1. `frontend/` → `WebsocketManager` opens Socket.IO to `/audio` namespace at `/api/save-audio`
2. `AudioRecorder` captures WAV chunks via `extendable-media-recorder` and emits them over the socket
3. `AudioGateway` (backend) receives chunks, writes them to a `wav.FileWriter`, and calls `RadioAudioGateway.broadcastAudioChunk()`
4. On stop/disconnect, `AudioGateway` finalizes the WAV file, saves a DB record via `DBService`, and optionally uploads to S3 via `S3Service`

### Radio Listening Flow
1. `radio/` → `RadioAudioPlayer` opens Socket.IO to `/audio` namespace at `/api/radio-audio/`
2. Backend `RadioAudioGateway` holds a `Set<Socket>` of listeners and calls `server.emit('audio-chunk', chunk)` for every incoming chunk
3. `RadioAudioPlayer` queues chunks and plays them sequentially via the Web Audio API (`AudioContext`)

### Data Layer
- Prisma ORM → MySQL (`live_audio_db` / `audios` table)
- Redis → Cache for S3 signed URLs (TTL 3600s) + Socket.IO adapter
- S3 → Optional remote audio file storage (toggled by `USE_S3=true`)

### Nginx Routing
| Path prefix | Upstream |
|---|---|
| `/api/` | `backend:5000` |
| `/save-audio/` | `backend:5000` (WebSocket) |
| `/radio-audio/` | `backend:5000` (WebSocket) |
| `/audios/` | `backend:5000` |
| `/radio/` | `radio-frontend:3001` |
| `/` | `frontend:3000` |

## Architectural Patterns
- **Gateway pattern**: NestJS `@WebSocketGateway` decorators isolate WebSocket concerns from HTTP controllers
- **Service injection**: `S3Service` and `DBService` are injected into gateways via NestJS DI
- **Feature flag**: `USE_S3` env var switches between local filesystem and S3 storage without code changes
- **Dual-app frontend**: Recorder and listener are separate React apps sharing the same component/service structure
- **Imperative ref pattern**: `AudioTable` exposes a `refresh()` method via `forwardRef` + `useImperativeHandle`
