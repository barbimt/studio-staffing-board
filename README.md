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

Capacity is contractual FTE for the month (`fte × 100`); leave, holidays, and ceremonies are not deducted.

## Database

PostgreSQL runs in Docker. After the database is up, apply migrations with `pnpm db:migrate`.

To empty staffing data (people, projects, assignments, calendar) without dropping the database or migrations:

```bash
pnpm db:reset
```

That uses `DATABASE_URL` from `.env`. The board shows the first-run empty state until you import again.

After schema changes, generate a new SQL migration with `pnpm db:generate`, inspect it, then migrate again.

## Import again

Use **Import data** on a populated board to replace the current snapshot. The three files are a complete export: people are upserted by Employee ID, projects by name, and calendar events by UID. Records missing from the latest files are removed, including assignments of removed people or projects and occurrences of removed events. Assignments on remaining projects and occurrences of remaining events match the latest files. The latest successful import wins. There is no separate override history.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm format:check
pnpm build
```

GitHub Actions runs the same checks on pull requests and on `main`. Snapshot reconciliation tests need PostgreSQL; CI starts Postgres 17 and sets `TEST_DATABASE_URL`. Locally:

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/studio_capacity_test
```

Use a dedicated database so `pnpm test:run` does not truncate your development data. Apply migrations to that database with `DATABASE_URL` set to the same URL, then `pnpm db:migrate`.
