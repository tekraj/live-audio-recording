# Development Guidelines

## Code Quality Standards

### TypeScript / ESLint (Backend)
- Parser: `@typescript-eslint/parser` with `plugin:@typescript-eslint/recommended` + `plugin:prettier/recommended`
- Relaxed rules in use: `no-explicit-any: off`, `explicit-function-return-type: off`, `explicit-module-boundary-types: off`
- Prettier enforced via ESLint integration (`.prettierrc` present)
- Unused vars suppressed with `// eslint-disable-next-line @typescript-eslint/no-unused-vars` inline comments

### TypeScript Config
- `strict` mode implied by NestJS defaults; `tsconfig-paths` used for path aliases
- Path alias `@/mysql-prisma-client/` maps to `backend/generated/prisma/`
- Frontend uses CRA-managed tsconfig (no custom paths)

---

## Naming Conventions

| Context | Convention | Example |
|---|---|---|
| NestJS classes | PascalCase | `AudioGateway`, `S3Service`, `DBService` |
| NestJS files | kebab-case | `audio.gateway.ts`, `redis-adapter.ts` |
| React components | PascalCase | `AudioTable`, `RadioAudioPlayer` |
| React hooks | camelCase prefixed `use` | `useRecordAudio` |
| Env variables | SCREAMING_SNAKE_CASE | `AUDIO_UPLOAD_DIR`, `USE_S3` |
| Audio filenames | UUID v4 | `7b6c6af2-989e-4f72-a105-1fae6474a31b.wav` |
| Socket events | kebab-case strings | `'start-recording'`, `'audio-chunk'`, `'recording-stopped'` |
| DB table | snake_case via `@@map` | `@@map("audios")` |

---

## NestJS Backend Patterns

### WebSocket Gateway Declaration
Always declare namespace and path explicitly. Both gateways share the same namespace `/audio` but different paths:
```typescript
@WebSocketGateway({
  transports: ['websocket'],
  cors: true,
  namespace: 'audio',
  path: '/save-audio',   // or '/radio-audio/'
})
export class AudioGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
}
```

### Lifecycle Interfaces
Implement all three gateway lifecycle interfaces when the gateway manages stateful resources:
```typescript
implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
```
`RadioAudioGateway` omits these (simpler broadcast-only role) — only implement what is needed.

### Dependency Injection in Gateways
Inject services via constructor parameters; no field injection:
```typescript
constructor(
  private s3Service: S3Service,
  private dbService: DBService,
  private readonly radioAudioGateway: RadioAudioGateway,
) {}
```

### Service Pattern
- Services are `@Injectable()` classes with constructor DI
- `PrismaService` extends `PrismaClient` directly (no wrapper methods, just inheritance)
- `DBService` wraps Prisma calls with idempotency checks (findFirst before create)
- `S3Service` uses a feature-flag pattern: check `this.enabled` before any AWS SDK call

### Caching Pattern (Redis)
Cache is registered globally with `isGlobal: true`. Inject via `@Inject(CACHE_MANAGER)`:
```typescript
constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

// set with TTL (ms)
await this.cacheManager.set(key, value, 3600);
// get
const cached = await this.cacheManager.get<string>(key);
```
Global `CacheInterceptor` is applied via `APP_INTERCEPTOR` provider.

### REST Controller Pattern
- Use `@Get()` with array of route strings for aliased paths: `@Get(['audios/:filename', 'app/audio-recordings/:filename'])`
- Inject `@Res()` for streaming responses; use `createReadStream().pipe(res)` for file serving
- Fall back to S3 signed URL redirect when local file is absent

### Error Handling
- Gateway event handlers wrap logic in `try/catch` and swallow errors silently (log with `console.error`)
- Avoid throwing from WebSocket handlers; emit error events to the client instead
- Use `closingSessions: Set<string>` guard to prevent duplicate close handling on the same session

---

## Frontend Patterns

### Audio Recording State Machine
Recording state is managed via an enum and a custom hook:
```typescript
export enum RecordingState { IDEAL = "IDEAL", RUNNING = "RUNNING", PUASED = "PAUSED" }
```
The `useRecordAudio` hook owns the `WebsocketManager` ref and exposes `startRecording`, `pauseRecording`, `resumeRecording`, `stopRecording`.

### WebSocket Client Setup
Use `socket.io-client` `Manager` + `socket()` pattern (not `io()` shorthand) to control path and query params:
```typescript
const manager = new Manager(url, { query: { audioFileName }, transports: ['websocket'], path: '/api/save-audio' });
const socket = manager.socket('/audio', { auth: { authorization: 'authorization key' } });
```

### Audio Chunk Streaming
- `AudioRecorder` uses `extendable-media-recorder` with `mimeType: 'audio/wav'`
- Chunks are emitted every `timeslice=1000ms`
- When paused, send `new ArrayBuffer(0)` instead of real data to maintain stream continuity

### Radio Playback Queue
`RadioAudioPlayer` maintains a sequential playback queue using Web Audio API:
- `AudioContext` is lazily created on first chunk
- Chunks are decoded with `audioContext.decodeAudioData()` and played via `BufferSource`
- `source.onended` triggers `playNextChunk()` for gapless sequential playback
- Handles `ArrayBuffer`, `Uint8Array`, and base64 `string` chunk formats from socket.io

### Component Patterns
- Use `forwardRef` + `useImperativeHandle` to expose imperative methods from components:
```typescript
export const AudioTable = forwardRef<AudioTableRef>((_, ref) => {
  useImperativeHandle(ref, () => ({ refresh: fetchAudioRecords }));
});
```
- Cleanup WebSocket/audio resources in `useEffect` return function

### API Service Pattern
Centralize all HTTP calls in a `audioService` object (not a class) using a shared `axios` instance:
```typescript
const apiClient = axios.create({ baseURL: API_BASE_URL, timeout: 10000 });
export const audioService = {
  listAudioRecords: async (): Promise<AudioRecord[]> => { ... },
  getAudioFileUrl: async (filename, fileFormat) => { ... },
};
```

### Styling
- Tailwind CSS utility classes only — no custom CSS modules (except `App.css` for global resets)
- Gradient backgrounds: `bg-gradient-to-br from-purple-400 to-blue-500`
- Interactive buttons use `transform hover:scale-105` + `transition-colors duration-300`
- Rounded buttons: `rounded-full`

---

## Python Service Patterns

### Flask App Structure
```python
app = Flask(__name__)
CORS(app)  # always enable CORS

@app.route('/transcribe-audio', methods=['POST'])
def get_transcriptions():
    data = request.get_json(force=True)
    ...
```
- Use `force=True` on `get_json()` to avoid content-type issues
- Return plain text with status code tuples: `return text, 200`

### Whisper Model
- Load model once at module level (singleton via class instantiation)
- Device selection: `"cuda" if torch.cuda.is_available() else "cpu"`
- Always use `fp16=False` for CPU compatibility
- Wrap transcription in try/except and return `'error'` string on failure

---

## NATS JetStream Consumer Pattern
```typescript
const nc = await connect({ servers: NATS_URL });
const jsm = await jetstreamManager(nc);
await jsm.consumers.add(STREAM_NAME, {
  durable_name: DURABLE_NAME,
  ack_policy: AckPolicy.Explicit,
  deliver_policy: DeliverPolicy.All,
  filter_subject: 'audio.chunk.*',
});
const consumer = await js.consumers.get(STREAM_NAME, DURABLE_NAME);
for await (const msg of await consumer.consume()) {
  // process
  msg.ack();
}
```
- Always use `AckPolicy.Explicit` and call `msg.ack()` after processing
- Use durable consumer names from env (`CONSUMER_NAME`) with random fallback
- Spawn multiple consumers by calling the start function multiple times

---

## Docker & Infrastructure Conventions
- All services on `audio-network` bridge network
- Volumes are bind-mounted to `./data/<service>` for easy local inspection
- Backend container runs `npx prisma migrate deploy && node dist/main.js` as CMD
- `USE_S3=false` default keeps the stack self-contained without AWS credentials
- Nginx `proxy_read_timeout 86400` on all WebSocket locations to prevent long-lived connection drops
- Health check on MySQL uses `mysqladmin ping` with retries before backend starts
