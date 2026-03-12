# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy lockfile and package.json first for better caching
COPY pnpm-lock.yaml package.json ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

RUN npm install -g pnpm

# Copy package files
COPY pnpm-lock.yaml package.json ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy the compiled JS from the builder stage
COPY --from=builder /app/dist ./dist

# Start the consumer
CMD ["node", "dist/index.js"]