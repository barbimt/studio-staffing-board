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

## Import people and projects

These commands are local verification helpers. They read CSV files from `data/` so we can exercise the import pipeline before the upload UI exists. The application does not depend on those files. Once UI upload lands, these CLIs should be reviewed and removed or replaced.

People must be imported first so project team names can resolve to canonical people.

```bash
pnpm db:migrate
pnpm import:people
pnpm import:projects
```

Safe to run more than once: existing people are updated by Employee ID, existing projects by name, and assignments for imported projects are reconciled to the latest snapshot.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm format:check
pnpm build
```

GitHub Actions runs the same checks on pull requests and on `main`.
