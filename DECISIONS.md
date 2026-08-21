# Decisions

## Employee ID is the canonical external identity

**Why:** The HR CSV is the source of person identity. Project and calendar imports resolve to one person. Name, row order, and work email alone are too unstable for that.

**Trade-off:** If HR reissues an Employee ID, a new database person would be created. That is the correct HR semantics; we do not try to merge by name or email.

## Emails are trimmed and lowercased before persist and duplicate checks

**Why:** Calendar import matches attendee email to the canonical person. Case and surrounding whitespace must not create a second identity.

**Trade-off:** The stored value may differ from the source spelling. That is acceptable because email comparison is not case-sensitive.

## Re-import updates existing people on `employee_id`

**Why:** The import must be runnable again without duplicating people. PostgreSQL `ON CONFLICT (employee_id) DO UPDATE` keeps the internal `people.id` stable while refreshing mutable HR fields. Rows missing from the file are deleted first so a remaining person can reuse a departed work email. Remaining people who swap emails are parked on unique temporary addresses, then updated to the snapshot values.

**Trade-off:** A later file can overwrite local HR field values for people it contains. That is the intended source-of-truth behaviour for this import.

## Latest successful import is the canonical current snapshot

**Why:** The three imported files are treated as complete studio exports, not partial patches. A successful import reconciles Postgres to those sources: insert or update records that are present, and remove records that existed from a previous import but are missing from the latest file. People are identified by `employee_id`, projects by trimmed `Name`, calendar events by UID. Assignments of removed people or projects are deleted first because those foreign keys have no `ON DELETE`. Calendar occurrences cascade when their event is deleted. Recurring events keep the same UID; occurrence rows are reconciled to the latest RRULE.

**Trade-off:** Omitting a person, project, or event from the export removes it from the current staffing dataset. That is required so the board cannot keep showing stale rows such as Alex Turner after a people file that no longer lists him.

## Deterministic full-name matching

**Why:** Projects identify people only by full name. Matching trims, collapses repeated whitespace, and compares case-insensitively. There is no fuzzy matching, first-name-only matching, or nearest-name guessing.

**Trade-off:** A typo such as `Alex Tuner` fails the import instead of being guessed as `Alex Turner`. That is intentional: incorrect staffing data is worse than a failed import.

## Project name as import identity

**Why:** Current project names are unique in the supplied source. The import key is the trimmed source `Name`, which is also the unique `projects.name` column. We do not case-fold or collapse internal whitespace for project identity, because the database key does not.

**Trade-off:** The source has no project ID. `Orchard Grove` and `orchard grove` are different projects.

## Project assignment snapshot

**Why:** The project export is the authoritative current snapshot of every project. Existing projects are upserted by name. Assignments for those projects are inserted, updated, or removed so they match the latest Team and Allocation values. A project imported with zero assignments deletes every assignment for that project. Projects missing from the latest file are removed, along with their assignments.

**Trade-off:** Re-importing a shorter project list deletes omitted projects from the current dataset. There is no archive of dropped projects.

## Latest import wins

**Why:** The latest successful project import replaces the current assignment state for imported projects. There is no separate override layer.

**Trade-off:** Re-importing a project with a different team snapshot replaces the previous assignments for that project.

## Studio data is imported in the UI, not from repository files

**Why:** The three source files belong to the studio, not the git repo. A producer imports them through a dialog with three labeled file inputs (People CSV, Projects CSV, Leave calendar ICS). Auto-detecting two CSVs from a multi-file picker is easier to misuse than three explicit slots.

**Trade-off:** The application has no bundled staffing snapshot. A fresh database stays empty until someone imports.

## Client checks are UX-only; the importer owns correctness

**Why:** The browser and the route handler share the same shallow checks: all three files are present, look like `.csv` / `.ics`, are not empty, stay under `MAX_IMPORT_FILE_BYTES`, and have the required CSV headers or `BEGIN:VCALENDAR`. Filename, extension, and MIME type are not treated as proof of content. Row, matching, and recurrence rules stay in the parse/match pipeline. Optional people columns (`End Date`, `Manager Email`) may be omitted; missing headers are stored as empty.

**Trade-off:** A CSV with the right headers can still fail after submit. That failure is shown in the same dialog, grouped by source.

## Re-import updates the current snapshot

**Why:** The same dialog is used when data already exists. Copy warns that records missing from the imported files are removed. This is the canonical-snapshot rule, not a history product.

**Trade-off:** There is still no manual allocation override layer.

## One transaction owns People, Projects, and Calendar writes

**Why:** Parse all three files first. Then a single Drizzle `database.transaction` runs `importPeople`, `importProjects`, and `importCalendar`. Matching uses real `people` rows visible in that transaction after people are written. Inner per-importer transactions were removed so the outer transaction is the only boundary.

**Trade-off:** A persist failure rolls back the whole import. Parse/match errors never start the transaction.

## The board refreshes with router.refresh after import

**Why:** `/` already calls `connection()` and reads Postgres on each request, so there is no Full Route Cache to invalidate. The dialog does not copy parsed files into table state. `router.refresh()` runs only after `POST /api/import` returns `{ ok: true }`, which means the import transaction committed. A failed import keeps the dialog open, leaves the current board props unchanged, and does not refresh.

**Trade-off:** Until refresh completes, the user still sees the previous server render. That is the intended source of truth: the last committed snapshot.

## Calendar leave matches people by work email

**Why:** Email is the stable identifier shared by the HR export and person-specific leave attendees. Matching uses the same trim + lowercase normalisation as stored `people.work_email`. Names are not used.

**Trade-off:** Unmatched leave fails the whole import rather than creating people or storing unassigned leave. Incorrect availability is worse than a failed import.

## ICS all-day dates retain exclusive DTEND semantics

**Why:** ICS `VALUE=DATE` `DTEND` is exclusive. `DTSTART:20260921` / `DTEND:20260926` means 21–25 September. node-ical stores that DATE on a `Date` using local calendar components; we format those with `getFullYear` / `getMonth` / `getDate` so we do not convert the DATE through UTC.

**Trade-off:** All-day stored `end_date` is exclusive, the same as ICS. Inclusive last-day math would be off by one.

## Holiday categories map to regions, not studio sites

**Why:** `HOLIDAY-UK` and `HOLIDAY-PT` describe a holiday region, not a studio site. The mapping lives in one import-time table: `HOLIDAY-UK` → `UK`, `HOLIDAY-PT` → `PT`. Unknown categories are stored as source text with no inferred person or region.

**Trade-off:** People are stored with sites such as Bristol and Porto. Capacity joins those sites to holiday regions through one `regionForSite` map (`Bristol` → `UK`, `Porto` → `PT`). An unknown site gets personal leave only.

## Recurrences are materialised during import

**Why:** Monthly and person queries should read concrete `calendar_event_occurrences` rows and should not parse RRULE. Non-recurring events produce one range occurrence. Recurring events are expanded with node-ical.

**Trade-off:** Re-import must reconcile stale occurrence rows when a recurrence changes. Events missing from the latest ICS are removed, and their occurrences are removed with them.

## Unbounded RRULEs fail the import

**Why:** An RRULE with neither `UNTIL` nor `COUNT` has no finite snapshot. Materialising it would invent a window.

**Trade-off:** The current source is bounded (`UNTIL=20261012T235900Z`). An RRULE without `UNTIL` or `COUNT` cannot be imported.

## Core monthly capacity keeps contractual FTE and adds effective capacity

**Why:** The producer question is whether a person can take more work in the selected month after time off. `contractualCapacityPercentage = fte × 100` stays the baseline. `effectiveCapacityPercentage` is that value scaled by remaining weekdays after personal leave and public holidays for the person’s holiday region. Allocation is still the sum of overlapping assignment percentages. Status and remaining capacity are compared to effective capacity.

**Trade-off:** Someone who starts or ends mid-month still receives their full contractual percentage. We do not prorate employment by working days. Weekends never count. Leave and a regional holiday on the same weekday count once. Ceremonies do not reduce capacity.

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

## TanStack Table is headless with column resize, person sorting, and name search

**Why:** Typed column definitions and semantic table markup. Pagination and row selection stay off. Person is the only sortable column. The comparator is first name, then last name, matching how the cell is read and `getMonthlyCapacity`. A search box filters the same full name, so producers can find someone without changing sort.

**Trade-off:** Column sizing and resizing are registered. Person, Site, and Status are fixed width; Projects and Capacity can be resized. Sort and search state are client-only and reset when the month changes. The first sort click reverses the server A–Z order. Name search is a substring of `firstName lastName`, not a TanStack filter feature. No match keeps the table chrome and says no people match.

## Person detail keeps the selected month in the URL

**Why:** The board is the overview; `/people/[id]?month=YYYY-MM` is a deeper view of the same month. Back links and month controls keep `month` so producers do not lose their place.

**Trade-off:** An absent or invalid month still defaults to the current UTC month, the same as the board.

## Person detail explains effective capacity without a second formula

**Why:** `getPersonDetail` reuses `buildMonthlyPersonCapacity` and `mergeUnavailableWeekdays`. Leave and holiday weekday counts are shown separately; overlapping weekdays still count once toward effective capacity.

**Trade-off:** The board still only shows the union `unavailableWeekdays`. The split exists for the person page.

## UI allocation edits are not an override layer

**Why:** Producers can change an existing assignment percentage. The latest successful Projects import remains the canonical snapshot and can overwrite that value. 0% keeps the assignment; removing someone from a project is a separate future action. Over-allocation is allowed and shows as over capacity. The edit dialog previews monthly status with the same capacity status badge as the board.

**Trade-off:** There is still no local-beats-import layer. The person page does not repeat the import-overwrite warning beside every Edit control.

## Ended projects cannot be edited from the selected month

**Why:** On person detail, Edit is disabled when the project `endDate` is before the first day of the selected month. `updateAssignmentAllocation` enforces the same rule with the submitted `month`, so a hand-posted form cannot change allocation on work that has already finished relative to that month.

**Trade-off:** Mid-month endings stay editable while the selected month overlaps the project. Posting a different earlier `month` is equivalent to navigating to that month in the UI.

## Person time off is a monthly HTML timeline, not a Gantt

**Why:** The person page needs a glanceable view of leave and applicable public holidays in the selected month. A small HTML/CSS scale (leave bar, holiday marker, date list) is enough. Projects stay in the allocations list, not on this timeline. The list uses the same leave swatch as the legend, phrases ranges as `from` / `on` with a day count, and keeps holiday names as calendar markers.

**Trade-off:** There is no yearly Gantt and no third-party timeline library. Leave that crosses a month boundary is clipped to the selected month. Holidays are shown as the first day of the exclusive ICS range that falls in the month. Day counts are inclusive calendar days of the clipped range, not weekday-only capacity days.

## Person leave labels drop the ICS name suffix

**Why:** Calendar summaries often look like `Annual Leave - Wei Chen`. On that person's page the name is already in the header, so `leaveLabelFromSummary` removes a trailing ` - {firstName} {lastName}` when it matches. Holiday summaries stay unchanged.

**Trade-off:** A leave title that ends with a different person's name is left as stored. Matching is case-insensitive on the suffix only.

## Allocation preview uses shared pure math, not the query module

**Why:** The editor previews status with `previewMonthlyAllocation` in `capacity-math.ts`. That file is the arithmetic used by `buildMonthlyPersonCapacity`. The dialog does not import `getPersonDetail` or other server-only query code.

**Trade-off:** Preview assumes the draft integer parses; invalid input is not previewed.

## First-run empty is not an empty month

**Why:** `people.length === 0` can mean nobody is employed in the selected month, or that HR data has never been imported. First-run uses an explicit people-row count; an empty selected month does not prompt for import.

**Trade-off:** The first-run CTA opens the import dialog. An empty selected month still does not prompt as first-run; re-import remains available in the header.
