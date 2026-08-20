# Decisions

## Employee ID is the canonical external identity

**Why:** The HR CSV is the source of person identity. Project and calendar imports resolve to one person. Name, row order, and work email alone are too unstable for that.

**Trade-off:** If HR reissues an Employee ID, a new database person would be created. That is the correct HR semantics; we do not try to merge by name or email.

## Emails are trimmed and lowercased before persist and duplicate checks

**Why:** Calendar import matches attendee email to the canonical person. Case and surrounding whitespace must not create a second identity.

**Trade-off:** The stored value may differ from the source spelling. That is acceptable because email comparison is not case-sensitive.

## Re-import updates existing people on `employee_id`

**Why:** The import must be runnable again without duplicating people. PostgreSQL `ON CONFLICT (employee_id) DO UPDATE` keeps the internal `people.id` stable while refreshing mutable HR fields.

**Trade-off:** A later file can overwrite local HR field values for people it contains. That is the intended source-of-truth behaviour for this import.

## People missing from a later file are not deleted

**Why:** Absence from an export is not the same as leaving the studio. Employment already has `end_date`. Automatic deletion would invent a product rule we do not need.

**Trade-off:** Stale people remain until a later file end-dates them.

## Deterministic full-name matching

**Why:** Projects identify people only by full name. Matching trims, collapses repeated whitespace, and compares case-insensitively. There is no fuzzy matching, first-name-only matching, or nearest-name guessing.

**Trade-off:** A typo such as `Alex Tuner` fails the import instead of being guessed as `Alex Turner`. That is intentional: incorrect staffing data is worse than a failed import.

## Project name as import identity

**Why:** Current project names are unique in the supplied source. The import key is the trimmed source `Name`, which is also the unique `projects.name` column. We do not case-fold or collapse internal whitespace for project identity, because the database key does not.

**Trade-off:** The source has no project ID. `Orchard Grove` and `orchard grove` are different projects.

## Project assignment snapshot

**Why:** The project export is the authoritative current snapshot of assignments for imported projects. Existing assignments are updated, new assignments are added, and stale assignments are removed. A project imported with zero assignments deletes every assignment for that project.

**Trade-off:** Projects absent from a later file are left unchanged, including their assignments. We do not treat absence as proof that the project no longer exists.

## Latest import wins

**Why:** The latest successful project import replaces the current assignment state for imported projects. There is no separate override layer.

**Trade-off:** Re-importing a project with a different team snapshot replaces the previous assignments for that project.

## Studio data is imported in the UI, not from repository files

**Why:** The three source files belong to the studio, not the git repo. A producer imports them through a dialog with three labeled file inputs (People CSV, Projects CSV, Leave calendar ICS). Auto-detecting two CSVs from a multi-file picker is easier to misuse than three explicit slots.

**Trade-off:** The application has no bundled staffing snapshot. A fresh database stays empty until someone imports.

## Client checks are selection-only; the importer owns correctness

**Why:** The browser only checks that all three files are present, look like `.csv` / `.ics`, are not empty, and stay under `MAX_IMPORT_FILE_BYTES`. Filename, extension, and MIME type are not treated as proof of content. Row, matching, and recurrence rules stay in the existing parse/match pipeline.

**Trade-off:** A CSV with the right extension can still fail after submit. That failure is shown in the same dialog, grouped by source.

## Re-import updates the current snapshot

**Why:** The same dialog is used when data already exists. Copy warns that staffing data and project allocations will be replaced. This is the existing latest-import-wins rule, not a new history product.

**Trade-off:** There is still no manual allocation override layer.

## One transaction owns People, Projects, and Calendar writes

**Why:** Parse all three files first. Then a single Drizzle `database.transaction` runs `importPeople`, `importProjects`, and `importCalendar`. Matching uses real `people` rows visible in that transaction after people are written. Inner per-importer transactions were removed so the outer transaction is the only boundary.

**Trade-off:** A persist failure rolls back the whole import. Parse/match errors never start the transaction.

## The board refreshes with router.refresh after import

**Why:** `/` already calls `connection()` and reads Postgres on each request, so there is no Full Route Cache to invalidate. After `POST /api/import` succeeds, the client calls `router.refresh()` to re-render Server Components from the database. `revalidatePath` is not used.

**Trade-off:** A full browser reload would also show imported data. `router.refresh` avoids a navigation.

## Calendar leave matches people by work email

**Why:** Email is the stable identifier shared by the HR export and person-specific leave attendees. Matching uses the same trim + lowercase normalisation as stored `people.work_email`. Names are not used.

**Trade-off:** Unmatched leave fails the whole import rather than creating people or storing unassigned leave. Incorrect availability is worse than a failed import.

## ICS all-day dates retain exclusive DTEND semantics

**Why:** ICS `VALUE=DATE` `DTEND` is exclusive. `DTSTART:20260921` / `DTEND:20260926` means 21–25 September. Storing the same exclusive end date on `calendar_events` and `calendar_event_occurrences` avoids converting DATE values through timezones.

**Trade-off:** All-day stored `end_date` is exclusive, the same as ICS. Inclusive last-day math would be off by one.

## Holiday categories map to regions, not studio sites

**Why:** `HOLIDAY-UK` and `HOLIDAY-PT` describe a holiday region, not a studio site. The mapping lives in one import-time table: `HOLIDAY-UK` → `UK`, `HOLIDAY-PT` → `PT`. Unknown categories are stored as source text with no inferred person or region.

**Trade-off:** People are stored with sites such as Bristol and Porto. Monthly capacity does not join those sites to holiday regions.

## Recurrences are materialised during import

**Why:** Monthly and person queries should read concrete `calendar_event_occurrences` rows and should not parse RRULE. Non-recurring events produce one range occurrence. Recurring events are expanded with node-ical.

**Trade-off:** Re-import must reconcile stale occurrence rows when a recurrence changes. Events absent from a later file are left unchanged.

## Unbounded RRULEs fail the import

**Why:** An RRULE with neither `UNTIL` nor `COUNT` has no finite snapshot. Materialising it would invent a window.

**Trade-off:** The current source is bounded (`UNTIL=20261012T235900Z`). An RRULE without `UNTIL` or `COUNT` cannot be imported.

## Core monthly capacity is contractual FTE

**Why:** The required question is whether a person can take more work in the selected month. `contractualCapacityPercentage = fte × 100`. Leave, holidays, and ceremonies are stored from calendar import and are not part of this calculation.

**Trade-off:** Someone who starts or ends mid-month still receives their full contractual percentage. We do not prorate by working days.

## People and projects are active on month overlap

**Why:** A person or project contributes when their date range overlaps the selected month, including start or end during the month and dates that fall on the month boundaries.

**Trade-off:** Overlap is inclusive on stored `YYYY-MM-DD` values. We do not require the person or project to cover the whole month.

## Assignments follow the project date range

**Why:** Assignments have no start or end of their own. An assignment contributes for every month its project overlaps.

**Trade-off:** We cannot represent a person joining or leaving a still-running project at a different date than the project itself.

## Project status does not change allocation

**Why:** The source supplies allocation independently from status (`Active`, `Complete`, `On hold`). Core capacity uses project date overlap only.

**Trade-off:** An On hold or Complete project that overlaps the month still contributes its assignment percentages. Status is stored and shown; it does not change the numbers.

## Selected month lives in the URL

**Why:** The monthly board is a view of one month, not a separate resource. `/?month=YYYY-MM` keeps the selection shareable, refresh-safe, and back/forward friendly without client state.

**Trade-off:** An absent or invalid `month` query defaults to the current UTC month. We do not pick a month from imported fixture dates.

## Server Components load monthly capacity

**Why:** The board is a read of `getMonthlyCapacity`. The page loads data on the server and passes the domain result to presentational components. There is no API route or client fetch for this table.

**Trade-off:** Month changes navigate and re-render the server result. Interactive table behaviour stays in a small Client Component around TanStack Table.

## TanStack Table is headless and core-only

**Why:** Typed column definitions and semantic table markup, without sorting, filtering, pagination, or row selection.

**Trade-off:** Column sizing and resizing are registered. Person, Site, and Status are fixed width; Projects and Capacity can be resized.

## First-run empty is not an empty month

**Why:** `people.length === 0` can mean nobody is employed in the selected month, or that HR data has never been imported. First-run uses an explicit people-row count; an empty selected month does not prompt for import.

**Trade-off:** The first-run CTA opens the import dialog. An empty selected month still does not prompt as first-run; re-import remains available in the header.
