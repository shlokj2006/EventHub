# Implementation Order and Current State

This file originally described a tutorial-era sequence. The main application
features in that sequence are present in the current repository. See
[`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) and
[`FEATURE_CHECKLIST.md`](FEATURE_CHECKLIST.md) for current scope.

## Implemented sequence

1. MERN client/server structure, API and persistence.
2. Authentication, account verification, password recovery, and role/session
   enforcement.
3. Event discovery and admin event management.
4. Booking validation, reservations, expiry, cancellation, and recovery.
5. Admin paid-booking approval and manual payment-status record.
6. Event Staff assignment and scoped access.
7. Per-attendee tickets, PDF downloads, QR scanning, and server check-in.
8. Verification, reset, and booking email delivery.
9. Automated unit/controller/service tests and production client build.

## Recommended next work

1. Run automated checks and review all uncommitted changes before release.
2. Verify schema-declared indexes in the intended database; review duplicates
   before any unique-index change.
3. Rehearse a backed-up, approved database transition if the target deployment
   uses another database. A Git merge does not merge database records.
4. Complete deployment-specific SMTP, CORS, API, and cron checks.
5. Plan a full-site UX consistency redesign.
6. Separately design a real payment gateway, verification, webhooks, and
   reconciliation. Do not treat admin-selected `paid` as gateway verification.

No seed, migration, or production-data operation is part of this roadmap
document.
