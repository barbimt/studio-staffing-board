## Decisions

### 1. Matching people across the three files

- `Employee ID` from the People CSV is the canonical identity.
- Project members are matched by normalized full name because the Projects CSV has no person ID or email.
- Leave is matched by work email.
- If a project team member name is ambiguous or does not match anyone, the import fails instead of guessing.

### 2. Identifying projects

- The source has no project ID.
- The trimmed project name is the import identity (case-sensitive). Differently cased names are different projects.
- This assumes project names are unique and stable in the supplied data.

### 3. Importing full snapshots

- Each import is a complete current snapshot, not a partial update.
- Missing records are removed.
- Existing records are updated without creating duplicates.
- People, Projects, and Calendar changes are written together.
- If any part fails, the previous valid snapshot stays unchanged.

### 4. Calendar and recurrence

- For all-day leave, the final date in the calendar is the return date. Leave exported from 21 to 26 September therefore covers 21–25 September.
- Repeating calendar events are saved as individual occurrences during import.
- We only accept recurrences with a clear end date or a fixed number of occurrences.
- Never-ending recurrences and complex recurrence exceptions are rejected rather than partially imported.
- General studio events do not affect capacity or appear in the staffing UI.
- Leave and applicable public holidays are shown because they affect capacity.

### 5. Monthly capacity

- Contractual capacity is `FTE × 100`.
- Allocation comes from projects that overlap the selected month.
- Assignments use the project date range because the source does not provide separate dates for each assignment.
- Leave and applicable regional holidays reduce effective capacity.
- Capacity uses weekdays only. Weekend leave or holidays do not reduce effective capacity.
- Leave and a holiday on the same weekday count once.
- Unmapped sites get personal leave but no inferred regional holidays.
- If someone starts or leaves during a month, we still use their full FTE capacity for that month.
- Project status is descriptive and does not change allocation.

### 6. Allocation editing and forward planning

- Existing assignment percentages can be edited.
- Projects that ended before the selected month are not editable.
- Future projects are editable so producers can plan staffing ahead.
- Future allocations do not affect capacity until the project overlaps the selected month.
- Over-allocation is allowed.
- Setting an allocation to 0% keeps the assignment; it does not remove the person from the project.
- A later Projects import can overwrite manual allocation edits.

### 7. Person Detail

- Monthly capacity breakdown.
- Project assignments for the selected year.
- Allocation editing.
- Monthly leave and public holiday timeline.

## Out of scope / Possible improvements

- **Duplicate-name disambiguation:** A future import flow could ask the producer to choose the correct Employee ID when several employees share the same name.
- **Stable project IDs:** A source project ID would make project renames safer.
- **Assignment dates:** A future source could provide separate start and end dates for each person's assignment.
- **Mid-month employment:** Capacity could be prorated using the weekdays when the person was actually employed.
- **Allocation history:** A future version could keep manual overrides or allocation history separately from imported data.
- **Studio calendar:** General events could have a separate calendar view.
- **Authentication and deployment:** Google Workspace login and Cloud Run are outside this submission, as allowed by the brief.
