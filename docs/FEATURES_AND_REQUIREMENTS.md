# Features and Requirements

This document reflects the current repository implementation. Route details
are in [`API_CONTRACT.md`](API_CONTRACT.md); operational behavior is in
[`RESERVATION_POLICY.md`](RESERVATION_POLICY.md).

## Implemented scope

### Visitor and user

- Browse events; search titles and filter by category; view event details.
- Register as a regular user, verify email with an OTP, sign in, and recover a
  password through an expiring, single-use reset link.
- Request a booking OTP; book one or multiple tickets with attendee names and
  optional attendee email snapshots.
- View only the authenticated user's bookings, download their active ticket
  PDFs, and cancel eligible own bookings.

### Admin

- Create, update, and delete events; event mutation routes are admin-only.
- Read all bookings; approve paid-event bookings and choose `paid` or
  `not_paid` as an admin-recorded payment status; cancel/reject eligible
  bookings.
- Designate a verified existing account as Event Staff, assign or remove event
  assignments, and revoke the staff role.
- Download tickets explicitly as an admin and check in tickets for any event.

### Event Staff

- View assigned event projections and scan/check in tickets only for events
  currently assigned to them.
- Cannot manage events, bookings, users, payments, or staff assignments.

### Ticketing and operations

- Confirmed bookings have one active ticket per attendee. Ticket references
  are cryptographically random and unique by schema; issuance uses upserts to
  avoid duplicate attendee tickets.
- PDFs contain event/attendee details and a QR code encoding only the ticket
  reference. PDFs are generated in memory and require owner or admin access.
- The server verifies check-in eligibility and assignment, then conditionally
  records the actor and time. Concurrent duplicate scans cannot both win the
  conditional ticket update.
- Booking confirmation emails can attach one PDF per attendee and use bounded
  retry state. Other email types use the same Nodemailer utility.

## Booking rules

- Quantity is a positive safe integer; attendee data count must match it.
- Price and total are calculated from the server's Event data; supported
  currency is INR.
- New free bookings confirm and issue tickets immediately.
- New paid bookings reserve seats on creation and expire after 24 hours unless
  an admin confirms them. Confirmation does not reserve capacity again.
- Cancellation, admin rejection, and expiry release capacity idempotently and
  void issued tickets. Legacy bookings without reservation fields keep their
  compatibility behavior.
- `paid` means an admin recorded the status; no payment gateway verifies it.

## Deferred features

- Full-site UX redesign and visual consistency pass.
- Real online payment gateway integration.
- Gateway-verified payment status, webhooks, and reconciliation.
- Refund workflows and other features not present in the current routes.

These are future-version items, not current requirements satisfied by manual
admin approval. No separate organizer role, registration model, realtime
transport, ticket event-date restriction, or automatic ticket expiry is
implemented.
