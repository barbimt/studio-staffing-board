# Studio Capacity

Internal tool for seeing who has capacity across projects and months.

The app itself is not built yet. This repo is the Next.js + Postgres setup we will build on.

## Run locally

Needs Node 20.9+, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm dev
```

http://localhost:3000

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm format:check
```
