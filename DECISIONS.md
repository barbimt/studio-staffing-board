# Decisions

## Employee ID is the canonical external identity

**Why:** The HR CSV is the source of person identity. Later project and calendar imports must resolve to one person. Name, row order, and work email alone are too unstable for that.

**Trade-off:** If HR reissues an Employee ID, a new database person would be created. That is the correct HR semantics; we do not try to merge by name or email.

## Emails are trimmed and lowercased before persist and duplicate checks

**Why:** Calendar import will match attendee email to the canonical person. Case and surrounding whitespace must not create a second identity.

**Trade-off:** The stored value may differ from the source spelling. That is acceptable because email comparison is not case-sensitive.

## Re-import updates existing people on `employee_id`

**Why:** The import must be runnable again without duplicating people. PostgreSQL `ON CONFLICT (employee_id) DO UPDATE` keeps the internal `people.id` stable while refreshing mutable HR fields.

**Trade-off:** A later file can overwrite local HR field values for people it contains. That is the intended source-of-truth behaviour for this import.

## People missing from a later file are not deleted

**Why:** Absence from an export is not the same as leaving the studio. Employment already has `end_date`. Automatic deletion would invent a product rule we do not need.

**Trade-off:** Stale people remain until they are end-dated in a future import or handled by a later process.

## Deterministic full-name matching

**Why:** Projects identify people only by full name. Matching trims, collapses repeated whitespace, and compares case-insensitively. There is no fuzzy matching, first-name-only matching, or nearest-name guessing.

**Trade-off:** A typo such as `Alex Tuner` fails the import instead of being guessed as `Alex Turner`. That is intentional: incorrect staffing data is worse than a failed import.

## Project name as import identity

**Why:** Current project names are unique in the supplied source. The import key is the trimmed source `Name`, which is also the unique `projects.name` column. We do not case-fold or collapse internal whitespace for project identity, because the database key does not.

**Trade-off:** If the source later introduces a stable project ID, that should replace name-based identity. `Orchard Grove` and `orchard grove` would currently be treated as different projects.

## Project assignment snapshot

**Why:** The project export is the authoritative current snapshot of assignments for imported projects. Existing assignments are updated, new assignments are added, and stale assignments are removed. A project imported with zero assignments deletes every assignment for that project.

**Trade-off:** Projects absent from a later file are left unchanged, including their assignments. We do not treat absence as proof that the project no longer exists.

## Latest import wins

**Why:** The latest successful project import replaces the current assignment state for imported projects. If UI allocation editing is added later, a subsequent import may overwrite those manual edits.

**Trade-off:** The future import UI should warn before replacing current allocation state. That warning is not implemented yet, and we do not track manual overrides.

## Development CSV CLIs are verification-only

**Why:** Production import will be a UI upload. Files in `data/` are fixtures for local verification, not an application data source.

**Trade-off:** `pnpm import:people`, `pnpm import:projects`, and `pnpm import:calendar` exist only to exercise the pipeline locally. They should be reviewed and removed or replaced when the upload flow lands.

## Calendar leave matches people by work email

**Why:** Email is the stable identifier shared by the HR export and person-specific leave attendees. Matching uses the same trim + lowercase normalisation as stored `people.work_email`. Names are not used.

**Trade-off:** Unmatched leave fails the whole import rather than creating people or storing unassigned leave. Incorrect availability is worse than a failed import.

## ICS all-day dates retain exclusive DTEND semantics

**Why:** ICS `VALUE=DATE` `DTEND` is exclusive. `DTSTART:20260921` / `DTEND:20260926` means 21–25 September. Storing the same exclusive end date on `calendar_events` and `calendar_event_occurrences` avoids converting DATE values through timezones.

**Trade-off:** Later capacity calculations must treat `end_date` as exclusive for all-day events.

## Holiday categories map to regions, not studio sites

**Why:** `HOLIDAY-UK` and `HOLIDAY-PT` describe a holiday region. Bristol and Porto may later share a region. The mapping lives in one import-time table: `HOLIDAY-UK` → `UK`, `HOLIDAY-PT` → `PT`. Unknown categories are stored as source text with no inferred person or region.

**Trade-off:** Future capacity logic needs an explicit site-to-region mapping. That is not implemented yet.

## Recurrences are materialised during import

**Why:** Monthly and person queries should read concrete `calendar_event_occurrences` rows and should not parse RRULE. Non-recurring events produce one range occurrence. Recurring events are expanded with node-ical.

**Trade-off:** Re-import must reconcile stale occurrence rows when a recurrence changes. Events absent from a later file are left unchanged.

## Unbounded RRULEs fail the import

**Why:** An RRULE with neither `UNTIL` nor `COUNT` has no finite snapshot. Materialising it would invent a window.

**Trade-off:** The current source is bounded (`UNTIL=20261012T235900Z`). A later unbounded series must be given an explicit end or count before it can be imported.

## Core monthly capacity is contractual FTE

**Why:** The required question is whether a person can take more work in the selected month. For the core version, `contractualCapacityPercentage = fte × 100`. Leave and public holidays are imported but not applied yet.

**Trade-off:** This is not effective, month-adjusted availability. Someone who starts or ends mid-month still receives their full contractual percentage. We do not prorate by working days in this phase.

## People and projects are active on month overlap

**Why:** A person or project contributes when their date range overlaps the selected month, including start or end during the month and dates that fall on the month boundaries.

**Trade-off:** Overlap is inclusive on stored `YYYY-MM-DD` values. We do not require the person or project to cover the whole month.

## Assignments follow the project date range

**Why:** Assignments have no start or end of their own. An assignment contributes for every month its project overlaps.

**Trade-off:** We cannot represent a person joining or leaving a still-running project at a different date than the project itself.

## Project status does not change allocation

**Why:** The source supplies allocation independently from status (`Active`, `Complete`, `On hold`). Core capacity uses project date overlap only.

**Trade-off:** An On hold or Complete project that overlaps the month still contributes its assignment percentages. Status remains informational until a later product rule says otherwise.

## Selected month lives in the URL

**Why:** The monthly board is a view of one month, not a separate resource. `/?month=YYYY-MM` keeps the selection shareable, refresh-safe, and back/forward friendly without client state.

**Trade-off:** An absent or invalid `month` query defaults to the current UTC month. We do not pick a month from imported fixture dates.

## Server Components load monthly capacity

**Why:** The board is a read of `getMonthlyCapacity`. The page loads data on the server and passes the domain result to presentational components. There is no API route or client fetch for this table.

**Trade-off:** Month changes navigate and re-render the server result. Interactive table behaviour stays in a small Client Component around TanStack Table.

## TanStack Table is headless and core-only

**Why:** Typed column definitions and a reusable table structure now, without shipping sorting, filtering, pagination, or selection before the product needs them.

**Trade-off:** Those features can be registered later on the same table. This phase only renders rows.

## Column widths stay on the device, not in the URL

**Why:** `/?month=YYYY-MM` is a shareable view. Column widths are a personal layout preference, so they persist in `localStorage` and do not pollute month links.

**Trade-off:** A shared URL does not restore another person's column layout. Clearing site data resets widths to the column defaults.

## First-run empty is not an empty month

**Why:** `people.length === 0` can mean nobody is employed in the selected month, or that HR data has never been imported. First-run uses an explicit people-row count; an empty selected month does not prompt for import.

**Trade-off:** Import is a later phase. The first-run CTA is visible and disabled so it does not fake an upload.
