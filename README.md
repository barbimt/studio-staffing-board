# Studio Staffing Board

Internal monthly view of people, project allocations, and available capacity.

## 🎥 Demo

Short walkthrough of the board

https://github.com/user-attachments/assets/49d47317-4e8c-4b8f-9c0e-b33bf75592d6


## 🚀 Run locally

You need Node.js 22.22.2 or newer, pnpm, Docker Compose, and Git.

```bash
git clone git@github.com:barbimt/studio-staffing-board.git
cd studio-staffing-board
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm dev
```

If `pnpm` is missing, enable it with Corepack and try again:

```bash
corepack enable
pnpm install
```

Open http://localhost:3000.

## 📥 Import data

Use **Import data** and pick three files:

- People CSV
- Projects CSV
- Leave calendar ICS

A successful import becomes the new current snapshot. Records missing from the new files are removed.

If validation fails, the current data stays unchanged.

### Sample files

If you do not have studio exports yet, use the files in [`samples/`](./samples/):

| File                                                         | Use for        |
| ------------------------------------------------------------ | -------------- |
| [`samples/people.csv`](./samples/people.csv)                 | People         |
| [`samples/projects.csv`](./samples/projects.csv)             | Projects       |
| [`samples/leave-calendar.ics`](./samples/leave-calendar.ics) | Leave calendar |

### People CSV columns

| Column          | Required | Notes                                                |
| --------------- | -------- | ---------------------------------------------------- |
| `Employee ID`   | Yes      | Person identity across imports                       |
| `First Name`    | Yes      |                                                      |
| `Last Name`     | Yes      | Matched to project `Team` names                      |
| `Work Email`    | Yes      | Matched to calendar leave attendees                  |
| `Department`    | Yes      |                                                      |
| `Job Title`     | Yes      |                                                      |
| `Site`          | Yes      | `Bristol` → UK holidays, `Porto` → Portugal holidays |
| `FTE`           | Yes      | e.g. `1.0` or `0.8`                                  |
| `Start Date`    | Yes      | `YYYY-MM-DD`                                         |
| `End Date`      | No       | Leave empty if still employed                        |
| `Manager Email` | No       |                                                      |

### Projects CSV columns

| Column         | Required | Notes                                                 |
| -------------- | -------- | ----------------------------------------------------- |
| `Name`         | Yes      | Project identity (no project ID in the source)        |
| `Status`       | Yes      |                                                       |
| `Client`       | Yes      |                                                       |
| `Platform`     | Yes      | Quote values that contain commas                      |
| `Start`        | Yes      | `YYYY-MM-DD`                                          |
| `End`          | Yes      | `YYYY-MM-DD`, on or after `Start`                     |
| `Team`         | Yes      | Comma-separated full names, same order as allocations |
| `Allocation %` | Yes      | Comma-separated integers, same count as `Team`        |

### Leave calendar ICS

The file must be valid ICS and include `BEGIN:VCALENDAR`.

- Personal leave: category `LEAVE`, attendee email matching `Work Email`
- Public holidays: `HOLIDAY-UK` or `HOLIDAY-PT`
- Other events may import, but they do not change capacity

## 🗄️ Database

Schema changes live in `drizzle/`. After editing `src/server/db/schema.ts`:

```bash
pnpm db:generate
pnpm db:migrate
```

To clear imported staffing data without dropping the schema:

```bash
pnpm db:reset
```

## ✅ Tests and checks

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test:run
pnpm build
```

## 🧰 Stack notes

- Drizzle was the only part of the stack I had not used before this project.
- Cloud Run deployment and Google Workspace auth are out of scope.
- Do not commit `.env` or credentials. `.env.example` only has safe local values.

## 💰 Approximate running cost

For a small internal tool with low traffic, Cloud Run should stay cheap and may
stay near the free tier.

The managed Postgres database is usually the main cost. A small Cloud SQL setup
is often in the low tens of USD per month. Region, instance size, storage,
backups, and availability all change that number.

Check the final setup with the
[Google Cloud pricing calculator](https://cloud.google.com/products/calculator).

## 📚 Further documentation

- [DECISIONS.md](./DECISIONS.md) — main product and data decisions
- [RELEASE-NOTE.md](./RELEASE-NOTE.md) — studio-facing announcement
