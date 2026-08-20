# Studio Capacity

Internal tool for seeing who has capacity across projects and months.

The app itself is not built yet. This repo is the Next.js + Postgres setup we will build on.

## Run locally

Needs Node 20.9+, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

http://localhost:3000

## Database

PostgreSQL runs in Docker. After the database is up, apply migrations with `pnpm db:migrate`.

After schema changes, generate a new SQL migration with `pnpm db:generate`, inspect it, then migrate again.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm format:check
pnpm build
```

GitHub Actions runs the same checks on pull requests and on `main`.
