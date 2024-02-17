FROM node:18-alpine AS base

RUN apk update 

# Optionally, you can specify the version of pnpm to install
# ENV PNPM_VERSION=<desired version>

RUN npm install -g pnpm@latest --force

WORKDIR /app

COPY ./backend .

RUN pnpm install

FROM base AS runner

WORKDIR /app/backend

