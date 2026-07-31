# Technology Stack

## Languages
- **TypeScript** (backend: ^5.1.3, frontend: ^4.9.5, live-transcription: ^5.7.3)
- **Python 3** (audio-transcription service)

## Backend (NestJS)
| Package | Version | Purpose |
|---|---|---|
| `@nestjs/core` | ^10 | Framework |
| `@nestjs/websockets` + `@nestjs/platform-socket.io` | ^10 | WebSocket gateways |
| `@nestjs/cache-manager` + `@keyv/redis` | ^3 / ^5 | Redis-backed caching |
| `@nestjs/config` | ^3 | `.env` loading |
| `@nestjs/axios` | ^3 | HTTP client |
| `@prisma/client` + `prisma` | 6.7.0 | ORM (MySQL) |
| `@aws-sdk/client-s3` + `s3-request-presigner` | ^3 | S3 upload & signed URLs |
| `socket.io` + `@socket.io/redis-adapter` | ^4 / ^8 | WebSocket server |
| `wav` | ^1 | WAV file writing |
| `redis` | ^4 | Redis client |
| `@nats-io/nats-core` + `@nats-io/jetstream` | ^3 | NATS messaging (dep, not yet wired in backend) |

## Frontend (React — both `frontend/` and `radio/`)
| Package | Version | Purpose |
|---|---|---|
| `react` + `react-dom` | ^18 | UI framework |
| `typescript` | ^4.9.5 | Type safety |
| `socket.io-client` | ^4.7.4 | WebSocket client |
| `extendable-media-recorder` + `-wav-encoder` | ^9 / ^7 | WAV recording in browser |
| `axios` | ^1.7.7 | HTTP API calls |
| `uuid` | ^9 | Session filename generation |
| `tailwindcss` | ^3.4.1 | Utility-first CSS |

## Audio Transcription (Python Flask)
| Package | Purpose |
|---|---|
| `openai-whisper` | Speech-to-text model |
| `torch` | ML backend (CUDA if available) |
| `Flask` + `flask_cors` | HTTP server |
| `numba`, `numpy`, `tiktoken` | Whisper dependencies |

## Live Transcription (Node.js NATS Consumer)
| Package | Version | Purpose |
|---|---|---|
| `@nats-io/transport-node` | ^3 | NATS connection |
| `@nats-io/jetstream` | ^3 | JetStream consumer API |
| `dotenv` | ^16 | Env config |

## Infrastructure
| Service | Image | Port |
|---|---|---|
| MySQL | `mysql:8.0` | 3308→3306 |
| Redis | `redis:7-alpine` | 6377→6379 |
| Nginx | `nginx:alpine` | 80 |
| Backend | Custom (Node 20) | 5000 |
| Frontend | Custom (Node) | 3000 |
| Radio Frontend | Custom (Node) | 3001 |

## Package Manager
- **pnpm** `8.15.6` used across all Node.js services

## Build & Dev Commands

### Backend
```bash
pnpm start-dev          # watch mode
pnpm build              # nest build → dist/
pnpm start:prod         # node dist/src/main.js
npx prisma migrate dev  # run migrations (dev)
npx prisma migrate deploy # run migrations (prod, used in docker CMD)
pnpm test               # jest unit tests
pnpm test:e2e           # jest e2e tests
pnpm lint               # eslint --fix
pnpm format             # prettier --write
```

### Frontend / Radio
```bash
pnpm start              # react-scripts start (CRA dev server)
pnpm build              # react-scripts build → static files
pnpm test               # react-scripts test
```

### Live Transcription
```bash
pnpm dev                # tsx watch src/index.ts
pnpm build              # tsc
pnpm start              # node dist/index.js
```

### Docker (full stack)
```bash
docker-compose up --build       # start all services
docker-compose down             # stop
docker-compose down -v          # stop + remove volumes
docker-compose logs <service>   # view logs
```

## Environment Variables (key ones)
```env
DATABASE_URL=mysql://root:<password>@db:3306/live_audio_db
REDIS_HOST=redis
REDIS_PORT=6379
PORT_NUMBER=5000
AUDIO_UPLOAD_DIR=/app/audio-recordings
USE_S3=false                          # set true to enable S3
AWS_S3_BUCKET_NAME=<bucket>
AWS_REGION=us-east-1
REACT_APP_AUDIO_SERVER_URL=http://localhost:5000/
REACT_APP_AUDIO_TRANSCRIBER_URL=http://localhost:5555/
NATS_URL=nats://localhost:4222
```

## Prisma Schema (Audio model)
```prisma
model Audio {
  id         Int      @id @default(autoincrement())
  filename   String   @db.VarChar(255)
  fileFormat String   @db.VarChar(10)
  length     Int      // Duration in seconds
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@map("audios")
}
```
Generated client output path: `backend/generated/prisma` (imported as `@/mysql-prisma-client/index`).
