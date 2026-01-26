# Docker Setup and Configuration Guide

## Overview
This document provides information about the Docker setup for the Live Audio Recording application. All environment variables are centralized in a `.env` file.

## Environment Variables (.env)

The `.env` file contains all configuration variables for the application. Copy `.env.example` to `.env` and update values as needed.

### Key Environment Variables

#### Application Environment
- `NODE_ENV`: Node environment (development/production)
- `FLASK_ENV`: Flask environment (development/production)
- `LOG_LEVEL`: Logging level (debug/info/warning/error)

#### Redis Configuration
- `REDIS_HOST`: Redis hostname (default: redis)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (empty by default)
- `REDIS_DB`: Redis database number (default: 0)

#### MySQL Database Configuration
- `DB_HOST`: Database hostname (default: db)
- `DB_PORT`: Database port (default: 3306)
- `DB_USER`: Database user (default: root)
- `DB_PASSWORD`: Database password (default: root123)
- `DB_NAME`: Database name (default: audio_db)
- `MYSQL_ROOT_PASSWORD`: MySQL root password
- `MYSQL_DATABASE`: MySQL database name

#### Service Configuration
- `BACKEND_HOST`: Backend API hostname (default: backend)
- `BACKEND_PORT`: Backend API port (default: 3000)
- `AUDIO_TRANSCRIBER_HOST`: Audio transcription service hostname
- `AUDIO_TRANSCRIBER_PORT`: Audio transcription service port (default: 5555)
- `NGINX_PORT`: Nginx port (default: 80)
- `NGINX_HOST`: Nginx hostname (default: localhost)

#### Volume Paths
- `AUDIO_DATA_PATH`: Audio data directory (default: ./data/audio)
- `DB_DATA_PATH`: Database data directory (default: ./data/db)
- `FRONTEND_BUILD_PATH`: Frontend build directory (default: ./data/frontend)
- `REDIS_DATA_PATH`: Redis data directory (default: ./data/redis)

#### Network
- `DOCKER_NETWORK_NAME`: Docker network name (default: audio-network)

## Services

### 1. Redis (audio-redis)
- **Image**: redis:7-alpine
- **Port**: Configurable via `REDIS_PORT`
- **Health Check**: Redis ping check every 10s
- **Volume**: redis-data

### 2. MySQL Database (audio-db)
- **Image**: mysql:8.0
- **Port**: Configurable via `DB_PORT`
- **Health Check**: MySQL ping check every 10s
- **Credentials**: Configured via .env
- **Volume**: db-volume

### 3. Backend API (audio-backend)
- **Build**: From ./backend/Dockerfile
- **Port**: Configurable via `BACKEND_PORT`
- **Health Check**: HTTP GET to http://localhost:3000 every 15s
- **Dependencies**: Redis, MySQL (service_healthy)
- **Command**: Runs `pnpm run start-dev` for development
- **Volumes**: ./backend (code), /app/node_modules

### 4. Frontend Build (audio-frontend-build)
- **Build**: From ./frontend/Dockerfile
- **Build Only**: No run command, builds and outputs to volume
- **Volume**: frontend-build (build artifacts)

### 5. Nginx (audio-nginx)
- **Image**: nginx:alpine
- **Port**: Configurable via `NGINX_PORT`
- **Health Check**: HTTP GET check every 10s
- **Config**: ./nginx/default.conf
- **Serves**: Frontend build artifacts from frontend-build volume

### 6. Audio Transcriber (audio-transcriber)
- **Build**: From ./audio-transcription/Dockerfile
- **Port**: Configurable via `AUDIO_TRANSCRIBER_PORT`
- **Health Check**: HTTP GET to http://localhost:5555/health every 15s
- **Dependencies**: Redis (service_healthy)
- **Volumes**: ./audio-transcription, audio-volume

## Docker Network

All services are connected via the `${DOCKER_NETWORK_NAME}` bridge network (default: audio-network).

Services can communicate internally using their container names:
- Backend → Redis: `redis:6379`
- Backend → MySQL: `db:3306`
- Audio Transcriber → Redis: `redis:6379`

## Getting Started

### 1. Initial Setup
```bash
# Copy the environment template
cp .env.example .env

# Update .env with your configuration if needed
nano .env

# Build and start all services
docker-compose up -d
```

### 2. Check Service Status
```bash
# View all services
docker-compose ps

# Check logs
docker-compose logs -f [service-name]

# Check specific service health
docker-compose exec [service-name] [health-check-command]
```

### 3. Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop and remove all data (caution!)
docker-compose down -v --remove-orphans
```

## Health Checks

All services have health checks enabled:

- **Redis**: TCP ping check (10s interval, 5s timeout, 5 retries)
- **MySQL**: MySQL ping check (10s interval, 5s timeout, 5 retries)
- **Backend**: HTTP GET check (15s interval, 5s timeout, 5 retries)
- **Nginx**: HTTP GET check (10s interval, 5s timeout, 5 retries)
- **Audio Transcriber**: HTTP GET check (15s interval, 5s timeout, 5 retries, 30s start period)

Backend and Audio Transcriber have a 30s startup grace period before health checks begin.

## Volumes

All volumes use local bind mounts pointing to ./data directory:

| Volume Name | Mount Point | Local Path |
|------------|-------------|-----------|
| redis-data | /data | ./data/redis |
| db-volume | /var/lib/mysql | ./data/db |
| frontend-build | /app/build | ./data/frontend |
| audio-volume | /app/recordings | ./data/audio |

## Dockerfile Improvements

### Backend Dockerfile
- Changed default command from `start:prod` to `start-dev` for development
- Made build step optional with fallback (`|| true`) for flexibility
- Command can be overridden in docker-compose

### Audio Transcription Dockerfile
- Added `curl` package for health checks
- Added HEALTHCHECK directive with appropriate timing
- Optimized pip install with `--no-cache-dir`

### Frontend Dockerfile
- No changes required (build-only stage)

## Security Considerations

⚠️ **Important for Production:**

1. Change database password in .env
2. Set REDIS_PASSWORD in .env
3. Use environment-specific .env files:
   - `.env.development`
   - `.env.production`
4. Never commit .env to version control
5. Enable SSL in production (set `ENABLE_SSL=true`)
6. Implement authentication (set `ENABLE_AUTH=true`)
7. Use Docker secrets for sensitive data
8. Restrict network access appropriately

## Troubleshooting

### Service won't start
- Check logs: `docker-compose logs [service-name]`
- Verify ports are available: `netstat -tuln | grep [PORT]`
- Check .env variables are set correctly

### Health check failing
- Check logs for error messages
- Verify dependencies are running first
- Ensure health check endpoints are accessible

### Volume permission issues
- Ensure ./data directory exists and is writable
- Check Linux file permissions: `ls -la ./data`

### Network connectivity issues
- Verify services can resolve each other: `docker-compose exec [service] nslookup [service-hostname]`
- Check network isolation is not blocking communication

## Command Reference

```bash
# View active services
docker-compose ps

# View logs (live)
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend

# Execute command in container
docker-compose exec [service] [command]

# Access database
docker-compose exec db mysql -u root -p audio_db

# Access Redis CLI
docker-compose exec redis redis-cli

# Rebuild services
docker-compose up -d --build

# Clean rebuild (fresh start)
docker-compose down -v && docker-compose up -d --build
```

## Performance Optimization

For production deployments:

1. **Database**: Configure MySQL for performance
   - Adjust `max_connections`, `innodb_buffer_pool_size`
   - Enable appropriate indexes
   - Regular backups: `docker-compose exec db mysqldump ...`

2. **Redis**: Monitor memory usage
   - Set `maxmemory` policy
   - Monitor with: `docker-compose exec redis redis-cli INFO memory`

3. **Backend**: Configure NestJS appropriately
   - Set `NODE_ENV=production`
   - Configure compression
   - Use clustering for multi-core systems

4. **Nginx**: Enable caching
   - Configure static file caching
   - Enable gzip compression
   - Use appropriate worker processes

