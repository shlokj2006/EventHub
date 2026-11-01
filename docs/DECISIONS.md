# Architecture and Product Decisions

These decisions describe the current implementation and constraints. Use
[`API_CONTRACT.md`](API_CONTRACT.md) and [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md)
as the current technical references.

## D-001: MERN architecture

**Decision:** React/Vite client, Node/Express API, MongoDB through Mongoose.
**Reason:** A JavaScript full-stack implementation fits the project and its
learning goals.

## D-002: General-purpose event booking

**Decision:** EventHub is not limited to college events. Current roles are
`user`, `event_staff`, and `admin`; admins manage events. **There is no
organizer role in the schema or route guards.**

## D-003: Server-side authorization and authoritative data

**Decision:** Server middleware and controllers enforce roles, ownership,
event-staff assignment, price, capacity, ticket eligibility, and check-in.
Frontend route guards are for navigation, not security.

## D-004: Recoverable reservations without transaction assumptions

**Decision:** Seat changes and capacity claims are atomic within one Event
document; booking and event writes are reconciled using persisted states.
**Reason:** The repository does not establish that deployed MongoDB supports
transactions. This is recoverable cross-document logic, not transaction-level
atomicity.

## D-005: Manual paid-booking approval

**Decision:** Admins confirm pending paid bookings and select `paid` or
`not_paid`. **This only records an admin choice; it is not gateway-verified.**
Free bookings confirm automatically.

## D-006: Ticket and check-in integrity

**Decision:** One active ticket per attendee, secure opaque references, private
PDF downloads, and server-side conditional check-in with staff assignment
validation. No ticket event-date expiry window is invented.

## D-007: Safe database transition

**Decision:** The local development database is `eventhub_dev`. The production
database name must be verified from actual deployment configuration and is not
assumed here. A merge does not merge database records. Backups, a tested
migration/reconciliation plan, duplicate checks, and explicit review are
required before live changes; no destructive data operation is implicit.

## Deferred decisions

A full-site UX redesign and real payment integration—including provider
verification, webhooks, and reconciliation—are future-version work. Choose a
provider and define security/idempotency requirements before implementation.
