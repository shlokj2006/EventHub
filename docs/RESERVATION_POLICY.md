# Booking Capacity and Reservation Policy

## Capacity meaning

`Event.availableSeats` is the number of seats not currently allocated. Existing confirmed bookings have already reduced this number. Legacy pending bookings did not reserve seats and continue to do so until approved. Legacy bookings without reservation fields are not treated as active reservations.

New booking requests first atomically decrement `availableSeats` and add a matching `Event.capacityClaims` entry, then create the `Booking` in `reserving` state. The claim includes booking ID, user ID, quantity, state, and (for paid events) its expiry. The event update is also the per-event duplicate-user guard and the event lifecycle admission gate. The booking is then finalized as pending/reserved for paid events or confirmed/consumed for free events. A paid approval changes a reserved booking to confirmed/consumed without another seat decrement.

Rejection, cancellation, and expiry first make the booking non-approvable, then remove its matching event claim and return its quantity in one atomic event update. Repeating the release cannot return seats twice because the claim is removed by the same update that increments capacity. Legacy confirmed bookings have no claim, so their first cancellation uses `legacyCapacityReleaseIds` as a durable idempotency marker. The marker is removed after the booking is durably marked released. Legacy pending bookings release no seats.

## Expiry

Paid reservation expiry is set by the API to server time plus 24 hours. This is
the approval deadline, not the time when the scheduled cleanup necessarily
runs. Admin approval checks `reservationExpiresAt` inline and rejects an
expired reservation even if cleanup has not run yet. The scheduled endpoint
expires overdue pending reservations, releases their reserved seats, and
reconciles interrupted reserve/release operations.

The serverless API does not start an in-process timer. On the Vercel Hobby
plan, `vercel.json` schedules `GET /api/bookings/maintenance/expire` once daily
at midnight UTC (5:30 AM IST), using `0 0 * * *`. As a result, seat cleanup can
occur up to approximately 24 hours after the reservation reaches its 24-hour
expiry threshold. Approval remains blocked from the threshold onward because
the approval endpoint checks expiry inline. Configure a long random
`CRON_SECRET` in the deployment environment; Vercel sends it as
`Authorization: Bearer ...`. If this API is deployed somewhere other than
Vercel, configure that platform's scheduler to call the same endpoint with the
same authorization header.

The same protected maintenance request retries eligible confirmed-booking
email deliveries. Delivery claims use a persisted lease to suppress concurrent
attempts, and retries use a bounded backoff. After repeated failures, an
authorized admin can retry by repeating the same-status confirmation action.
Legacy confirmed bookings with no delivery state are not queued automatically.
An SMTP timeout can happen after the server accepted a message; retrying a
stale lease after that ambiguous outcome may send a duplicate.

## Recovery and transaction assumptions

The repository does not prove that the production MongoDB deployment is a replica set or supports transactions. This implementation does not rely on MongoDB transactions. Instead, the booking's `reserving` / `releasing` states and the event's embedded capacity claims form a recoverable two-document workflow. Event seat changes and claim insertion/removal are atomic within one Event document. If the corresponding Booking write fails, the scheduled reconciler completes or releases the claim. Legacy release markers are retained to make retries idempotent.

This is not cross-document atomicity. Until the next scheduler run, interrupted operations may temporarily show a booking in a transitional state or hold seats. The event's claim array grows with active reservations and confirmed allocations until cancellation or expiry; monitor event document size for unusually high-volume events. Legacy release markers remain only while a release is in progress. Do not manually edit `availableSeats`, `capacityClaims`, or release markers independently.

## Event lifecycle and deletion coordination

Events are active by default (`isArchived: false`). Archiving sets
`isArchived: true`; restoring sets it to `false`. Both are admin-only and
preserve the event record, bookings, and tickets. Public lists and details
exclude archived events (a hidden detail returns 404); admins can view archived
events. New booking admission rejects archived events, while approval and
reservation reconciliation for existing bookings may continue against an
archived event. See [`API_CONTRACT.md`](API_CONTRACT.md) for routes and
responses.

Permanent deletion is admin-only and is rejected with HTTP 409 if any Booking
references the event, regardless of booking status. It is also rejected while
capacity claims remain. Before those checks, deletion obtains an atomic,
tokenized lease on the Event for 30 seconds. Normal new-booking capacity claims
require that no unexpired lease exists and atomically remove an expired lease
when they succeed. Deletion then conditionally deletes only if its token still
matches, its lease is unexpired, and no capacity claims remain. Cleanup in a
`finally` block releases the lease only when the token still matches; if the
process dies or release fails, expiry permits retry after at most the remaining
lease duration. A stale request cannot release another request's lease or
delete under a replaced token.

The Event-document updates serialize normal booking admission against final
deletion, but this is not a transaction across Event and Booking documents.
If the process stops after adding a capacity claim but before creating its
Booking, the claim temporarily holds seats and blocks deletion; reconciliation
releases it when it finds no corresponding Booking. If Booking creation has an
ambiguous result, reconciliation aligns the claim with the Booking if present
or releases it otherwise. Cleanup depends on maintenance running. Capacity
claim reconciliation currently reads at most 100 Event documents with claims
per invocation and has no explicit pagination cursor; a persistent first page
could delay orphan claims on later events. This behavior is not proof of
production concurrency or MongoDB topology.

Archive and restore do not acquire or check the deletion lease. Concurrent
admin archive/restore and permanent deletion requests can therefore race: an
archive/restore response may succeed immediately before the event is deleted.
This does not affect Booking or Ticket documents, but there is no lifecycle
mutation serialization for that admin-to-admin race.

## Data and indexes

No migration or production data update is required for the new optional booking fields. Existing confirmed bookings remain represented by the current `availableSeats` value; old pending bookings remain unreserved. No unique index is added because existing records have not been checked for duplicate active user/event bookings. New concurrent duplicate requests are serialized by the atomic event claim. A database audit is still required before adding a collection-level unique constraint.

## Operations

- Set `CRON_SECRET` in the server deployment environment. Keep it out of browser variables and logs.
- Confirm the cron is enabled after deployment and monitor `/api/bookings/maintenance/expire` invocation results.
- Alert on nonzero or repeated `reserving` / `releasing` records and database errors from the maintenance endpoint.
- Confirm MongoDB deployment topology before a later change considers transactions.
- Admin confirmation records the administrator's selected `paymentStatus` (`paid` or `not_paid`) separately from booking status. `paid` is an admin-entered record only and is not gateway-verified.

## Attendee tickets

New bookings snapshot event title/date, unit price, currency, and attendee details. Confirmed bookings receive one ticket per attendee. Ticket references are generated with secure randomness and have unique indexes on the public reference and `(bookingId, attendeeIndex)` pair. Ticket issuance uses upserts so repeated confirmation or a later booking-history read repairs partial issuance without duplicates. Free bookings confirm and issue tickets immediately; paid bookings issue tickets only after an admin confirms them.

Cancellation and expiry void existing tickets. Booking history only exposes active ticket references for confirmed bookings owned by the requesting user (or to an admin). The new Ticket collection creates its unique indexes before issuance; no existing booking data is rewritten. A cross-document crash can leave a confirmed booking temporarily missing tickets, but the next booking-history read or repeated same-status admin confirmation retries issuance. The implementation does not rely on MongoDB transactions.

If a confirmed legacy Booking has a missing or null `eventId`, ticket issuance
returns an empty result without attempting a ticket upsert; no event reference
is inferred or repaired. Booking history still queries and attaches any
already-existing active tickets for that Booking after the issuance attempt.
