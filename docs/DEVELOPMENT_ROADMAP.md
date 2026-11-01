# Development Roadmap

The steps below distinguish the current repository implementation from work
that remains. They are not a claim that the current branch is deployed or
release-approved.

## Implemented foundation

- MERN app structure, API routing, JWT authentication, bcrypt password hashes,
  account verification, password reset, and server-side authorization.
- Admin-managed event CRUD and public event discovery/search.
- Multi-attendee booking, server-calculated totals, free confirmation, paid
  seat reservations, 24-hour expiry, admin-recorded payment status, and
  reservation reconciliation.
- Event Staff designation and event assignment.
- Idempotent ticket issuance, ticket PDF/QR generation, private downloads,
  scanner UI, and server-side check-in.
- OTP, password reset, and confirmed-booking email flows.
- Backend/client utility tests and client build/lint scripts.

See [`FEATURE_CHECKLIST.md`](FEATURE_CHECKLIST.md) and
[`TEST_PLAN.md`](TEST_PLAN.md) for operational checks and evidence limits.

## Before a live release or database transition

1. Run the applicable automated checks and resolve or document failures.
2. Verify actual indexes read-only in each target database; apply only reviewed
   migrations after checking malformed records and duplicates.
3. Confirm the actual hosting environment, API routing, CORS, environment
   variables, scheduler, and SMTP configuration without exposing secrets.
4. Back up and rehearse any approved live data transition. Git merges do not
   merge MongoDB documents; preserve current users and relationships.
5. Perform an authorized end-to-end smoke test in the intended deployment.

The local seed and staff-index migration are restricted to loopback development
databases. Never run them against production. The production database name is
not known from repository files.

## Deferred next version

- Full-site UX redesign and consistency pass.
- Real online payment gateway integration.
- Provider-verified payment status, webhook handling, and payment
  reconciliation.

Admin approval can record `paid` or `not_paid`; this is manual status entry,
not a payment gateway. Refunds and other features not in current routes also
remain future work.
