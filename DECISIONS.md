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
