# Architecture

Feedback Board is one Node.js process and one SQLite file.

```
browser ──► web/ (React, Vite) ──► /api ──► server/app.ts (Hono)
                                              │
                                              ├─ server/feedback.ts  storage, filters, priority
                                              └─ server/digest.ts    weekly digest
                                                      │
                                                  feedback.db (node:sqlite)
```

## Decisions

- **SQLite, no ORM.** The data is small and relational; plain SQL in
  `FeedbackStore` keeps every query visible.
- **Priority is computed, not stored.** `priorityScore` weighs votes by customer
  tier and adds a capped boost for open feedback that has waited, so the score
  always reflects the current time.
- **Weeks run Monday to Monday** in the server's local time zone. Digests are
  computed on request and never cached.
- **Tags are free text.** They are trimmed and de-duplicated per item; there is
  no tag table to manage.

## Conventions

- Validation errors throw `ValidationError` and return `400`.
- The web app imports server types directly; there is no generated client.
- Tests use an in-memory database and an injected clock.
