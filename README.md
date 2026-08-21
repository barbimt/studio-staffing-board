# Studio Staffing Board

Internal monthly view of people, project allocations, and available capacity.

## Run locally

Requires Node.js 22.22.2 or newer, pnpm, Docker Compose, and Git.

```bash
git clone git@github.com:barbimt/studio-staffing-board.git
cd studio-staffing-board
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

If the `pnpm` command is not available, enable it with Corepack and retry:

```bash
corepack enable
pnpm install
```

Open http://localhost:3000.

## Import data

Choose **Import data** and select:

- People CSV
- Projects CSV
- Leave calendar ICS

All three files are imported together into PostgreSQL. A successful reimport
replaces the current snapshot without creating duplicates. If validation fails,
the existing data is left unchanged.

## Database

The schema is built from the SQL migrations in `drizzle/`. After changing
`src/server/db/schema.ts`, generate, review, and apply a new migration:

```bash
pnpm db:generate
pnpm db:migrate
```

To empty imported staffing data without removing the schema:

```bash
pnpm db:reset
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test:run
pnpm build
```

## Notes

- Drizzle was the only part of the stack I had not used before this project.
- Cloud Run deployment and Google Workspace authentication are outside scope.
- Do not commit `.env` files or credentials. `.env.example` contains only safe
  local example values.
- Implementation choices are recorded in [DECISIONS.md](./DECISIONS.md).
- The studio-facing announcement is in
  [RELEASE-NOTE.md](./RELEASE-NOTE.md).

## Approximate running cost

For a small internal deployment, Cloud Run may stay within its free tier.
Cloud SQL would likely be the main expense. A rough starting budget is
**USD 15–50 per month**, depending on region, database size, backups, and
availability. Verify the chosen configuration with the
[Google Cloud pricing calculator](https://cloud.google.com/products/calculator)
before deployment.
