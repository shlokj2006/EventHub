# Booking Capacity and Reservation Policy

## Capacity meaning

`Event.availableSeats` is the number of seats not currently allocated. Existing confirmed bookings have already reduced this number. Legacy pending bookings did not reserve seats and continue to do so until approved. Legacy bookings without reservation fields are not treated as active reservations.

New booking requests create a `Booking` in `reserving` state, then atomically decrement `availableSeats` and add a matching `Event.capacityClaims` entry. The claim includes booking ID, user ID, quantity, state, and (for paid events) its expiry. The event update is also the per-event duplicate-user guard. A paid request remains pending with `capacityState: reserved`; an approved booking changes to confirmed/consumed without another seat decrement. A free booking consumes capacity and becomes confirmed immediately, outside the admin approval queue.

Rejection, cancellation, and expiry first make the booking non-approvable, then remove its matching event claim and return its quantity in one atomic event update. Repeating the release cannot return seats twice because the claim is removed by the same update that increments capacity. Legacy confirmed bookings have no claim, so their first cancellation uses `legacyCapacityReleaseIds` as a durable idempotency marker. The marker is removed after the booking is durably marked released. Legacy pending bookings release no seats.

## Expiry

Paid reservation expiry is set by the API to server time plus 24 hours. Admin approval requires `reservationExpiresAt` to be later than the server's current time. The scheduled endpoint also expires overdue pending reservations and reconciles interrupted reserve/release operations.

The serverless API does not start an in-process timer. `vercel.json` schedules `GET /api/bookings/maintenance/expire` every 15 minutes. Configure a long random `CRON_SECRET` in the deployment environment; Vercel sends it as `Authorization: Bearer ...`. Verify that the deployed Vercel plan supports a 15-minute cron schedule. If this API is deployed somewhere other than Vercel, configure that platform's scheduler to call the same endpoint with the same authorization header. Admin approval also enforces expiry inline, so a delayed scheduler cannot approve an expired reservation.

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
