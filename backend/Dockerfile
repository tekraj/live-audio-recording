# Stage 1: Build
FROM node:22-alpine AS builder

# Install build tools required for native modules like bcrypt and for Prisma native binaries
RUN apk add --no-cache python3 make g++ openssl

# Enable Corepack and install a pnpm version that matches the existing lockfile format
RUN corepack enable && corepack prepare pnpm@8.15.6 --activate

WORKDIR /app

# Copy dependency files and fetch dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch --frozen-lockfile

# Copy the full source code including Prisma schema
COPY . .

# Install actual dependencies using fetched data
RUN pnpm install --frozen-lockfile
ARG DATABASE_URL

# 2. Set it as an environment variable for the build process
ENV DATABASE_URL=$DATABASE_URL
# Generate Prisma clients for all schemas
RUN npx prisma generate 

# Rebuild bcrypt to ensure native bindings are correctly compiled
RUN pnpm rebuild bcrypt

# Build the app
RUN pnpm build

# Stage 2: Production
FROM node:22-alpine AS production

# Install build tools for bcrypt runtime
RUN apk add --no-cache python3 make g++ openssl

# Enable Corepack and install a pnpm version that matches the existing lockfile format
RUN corepack enable && corepack prepare pnpm@8.15.6 --activate

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated/ ./generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Rebuild bcrypt for production environment
RUN pnpm rebuild bcrypt

EXPOSE 5000

