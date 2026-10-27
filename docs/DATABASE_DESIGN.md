# Database Design

The current database design is based on the Mongoose models, not the
tutorial-era Registration proposal. `Booking` is the registration record;
each `Ticket` references one attendee position in a booking. The current
relationships, schema fields, status values, and schema-declared indexes are
documented in [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

Capacity is represented by `Event.availableSeats` and embedded
`Event.capacityClaims`. A booking workflow changes the booking and event in
separate writes and uses recoverable states rather than MongoDB transactions.
See [`RESERVATION_POLICY.md`](RESERVATION_POLICY.md) for reservation,
reconciliation, cancellation, and expiry semantics.

Do not use the old user/event Registration index suggestion: no such model or
unique index is currently implemented. Assignment and ticket unique indexes
must be verified in the target database. Existing duplicate or malformed
records must be reviewed before creating an index; do not delete or merge
records automatically. The exact development-only staff assignment migration
and read-only verification steps are in `DATABASE_SCHEMA.md`.

The local development database is `eventhub_dev`. The current main/production
database name cannot be inferred from repository files; verify it from actual
deployment configuration. A Git merge does not transfer data. Back up and
test any reviewed data migration before changing live data, and preserve
existing users and their relationships.
