FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY contracts ./contracts

RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@safe-meet/shared --filter=@safe-meet/api --filter=web

ENV NODE_ENV=production
