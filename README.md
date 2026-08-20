# Studio Capacity

Internal tool for seeing who has capacity across projects and months.

The home page is the monthly staffing board. Open http://localhost:3000 or a specific month such as http://localhost:3000/?month=2026-09.

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

## Import people, projects, and calendar

These commands are local verification helpers. They read files from `data/`. The Next.js app does not read those paths.

People must be imported first so project team names and calendar leave attendees can resolve to canonical people.

```bash
pnpm db:migrate
pnpm import:people
pnpm import:projects
pnpm import:calendar
```

Safe to run more than once: existing people are updated by Employee ID, existing projects by name, assignments for imported projects are reconciled to the latest snapshot, and calendar events are upserted by UID with occurrences reconciled to the latest expansion.

## Query monthly capacity

After people and projects are imported, print contractual capacity for a month:

```bash
pnpm capacity 2026-09
```

This CLI is a local verification helper; the board at `/` uses the same `getMonthlyCapacity` function. Capacity is contractual FTE for the month (`fte × 100`); leave, holidays, and ceremonies are not deducted.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm format:check
pnpm build
```

GitHub Actions runs the same checks on pull requests and on `main`.
