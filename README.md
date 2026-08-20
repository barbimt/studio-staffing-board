# Studio Capacity

Internal tool for seeing who has capacity across projects and months.

The home page is the monthly staffing board. Open http://localhost:3000 or a specific month such as http://localhost:3000/?month=2026-09.

## Run locally

Needs Node 22.22+, pnpm, and Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

http://localhost:3000

When the board has no people yet, choose **Import data** and select the three studio files:

- People CSV
- Projects CSV
- Leave calendar ICS

Imported data is stored in PostgreSQL. Refreshing the page keeps the board; you do not import again unless the source files have changed.

## Database

PostgreSQL runs in Docker. After the database is up, apply migrations with `pnpm db:migrate`.

After schema changes, generate a new SQL migration with `pnpm db:generate`, inspect it, then migrate again.

## Import again

Use **Import data** on a populated board to replace the current snapshot. People are updated by Employee ID, projects by name, assignments for imported projects are reconciled to the latest file, and calendar events are upserted by UID. The latest successful import wins. There is no separate override history.

## Query monthly capacity

After data is imported, print contractual capacity for a month:

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
