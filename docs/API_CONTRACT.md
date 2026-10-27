# API Contract

This contract describes the routes registered by `server/index.js` and the
routers under `server/routes/`. Unless stated otherwise, requests and responses
use JSON. Bearer-authenticated routes use `Authorization: Bearer <JWT>`. Event
lists and booking lists are returned as arrays; the server does not currently
provide pagination.

Most controller errors use `{ "message": "..." }`. Ticket endpoints use
`{ "code": "...", "message": "..." }`. A database connection failure before
route handling returns HTTP 503 with `{ "message": "Service temporarily unavailable" }`.
See source for exact messages; they can differ by route.

## Authentication: `/api/auth`

| Method and path | Access | Request | Success | Important errors |
|---|---|---|---|---|
| `POST /register` | Public | `{name,email,password}`; a supplied `role` is ignored | 201 `{message,email}` after OTP email is accepted | 400 existing account; 503 account created but email failed; 500 other failure |
| `POST /login` | Public | `{email,password}` | 200 `{_id,name,email,role,token}` | 400 invalid credentials; 403 unverified account with `needsVerification`; 503 verification email failure |
| `POST /verify-otp` | Public | `{email,otp}` | 200 user identity and JWT | 400 invalid/expired OTP |
| `GET /me` | Authenticated | — | `{_id,name,email,role}` | 401 missing, invalid, or revoked token |
| `POST /forgot-password` | Public, rate limited | `{email}` | 200 generic message that does not reveal account existence | 400 invalid email; 429 rate limit; 503 service/mail failure |
| `POST /reset-password` | Public | `{token,password,confirmPassword}` | 200 success message | 400 malformed/expired/consumed token, invalid password, or mismatch; 503 processing failure |

Signup creates a regular `user` account regardless of a requested role. The
six-digit OTP expires after five minutes. On failed signup mail, the created
account remains; signing in with the correct password requests a fresh code.
Unverified users receive an OTP on login and are not issued a session until
verification. JWTs expire after 30 days and include the account's `tokenVersion`.
Password reset links expire after 30 minutes, are single-use, and revoke old
sessions by incrementing that version. Reset requests are limited to 5 per IP
and 3 per normalized email in each 15-minute window per server process;
counters are not shared across serverless instances.

## Events: `/api/events`

| Method and path | Access | Request | Success / behavior |
|---|---|---|---|
| `GET /` | Public; optional session validated | Optional query `category`, `search` | Bare array of events; `search` matches title case-insensitively. Event Staff list is assignment-scoped and projected. |
| `GET /:id` | Public; optional session validated | MongoDB event ID | Event document or 404. Event Staff can read only assigned events. |
| `POST /` | Admin | `{title,description,date,location,category,totalSeats,ticketPrice?,image?}` | 201 event; `availableSeats` starts at `totalSeats`, missing/falsey price defaults to 0. |
| `PUT /:id` | Admin | Editable fields: `title,description,date,location,category,image,ticketPrice` | Updated event; 400 invalid ID/details, 404 missing event. Capacity is not editable here. |
| `DELETE /:id` | Admin | MongoDB event ID | `{message}` or 404. |

There is no organizer role; event mutation routes require the `admin` role.

## Bookings: `/api/bookings`

| Method and path | Access | Request | Success / behavior |
|---|---|---|---|
| `POST /send-otp` | Authenticated | No body required | 200 `{message}` if the mail transport accepts the OTP; 503 if mail fails. |
| `POST /` | Authenticated | `{eventId,otp,quantity?,attendees?}` | 201 `{message,booking}`. `quantity` defaults to 1 and must be a positive safe integer no greater than available capacity. If quantity is 1, omitted `attendees` uses the account holder. Otherwise provide exactly `quantity` `{name,email?}` objects; name is required, max 120 characters, email is optional and validated. |
| `GET /my` | Authenticated | — | Bare array containing only the caller's bookings. Confirmed bookings include active ticket documents; overdue pending reservations are expired during the request. |
| `GET /admin` | Admin | — | Bare array of all bookings; expires/reconciles reservations first. |
| `PUT /:id/confirm` | Admin | `{paymentStatus:"paid"}` or `{paymentStatus:"not_paid"}` | Confirms a pending paid-event booking, issues tickets, and attempts confirmation email. Repeating the same choice is idempotent for ticket issuance and requests a mail retry. |
| `DELETE /:id` | Booking owner or admin | — | Cancels a pending or confirmed booking, releases capacity once, and voids tickets. An admin cancellation of a pending booking records rejection; an owner cancellation records cancellation. |
| `GET /maintenance/expire` | Cron bearer secret | — | Expires/reconciles bookings and retries eligible confirmation email deliveries. |

The server calculates price from the current Event document. `amount` is the
whole booking total; `unitPrice` and `currency` are stored separately. Currency
is currently limited to INR. Free bookings confirm and issue tickets
immediately. Paid bookings reserve seats immediately and remain pending for
24 hours. Admin approval records a manual payment status; it is not verified
against a gateway. Either valid choice confirms and issues tickets without
decrementing capacity a second time. Errors include 400 validation, OTP,
capacity, or duplicate-booking failures; 403 ownership failure; 404 missing
booking/event; 409 state/capacity conflicts; 410 expired approval; and 503
recoverable reservation writes. A mail failure does not roll back the booking.

## Event Staff: `/api/staff`

| Method and path | Access | Request | Success / behavior |
|---|---|---|---|
| `GET /events` | Event Staff | — | Bare array of currently assigned event projections. |
| `GET /events/:eventId` | Event Staff | Event ID | Assigned event projection; unassigned/missing event returns 404. |
| `GET /admin` | Admin | — | Staff accounts with assigned event summaries. |
| `POST /admin` | Admin | `{email}` | Designates an existing verified regular account; 201 `{staff}`. Does not create an account or issue a password. |
| `POST /admin/:staffId/events` | Admin | `{eventId}` | Assigns an event; repeated assignment is idempotent. |
| `DELETE /admin/:staffId/events/:eventId` | Admin | — | Removes that assignment. |
| `DELETE /admin/:staffId` | Admin | — | Revokes Event Staff role and removes assignments. |

Designation/revocation increment `tokenVersion`, so the staff member must sign
in again. Admins cannot designate or revoke themselves. Staff event detail
projections omit bookings, attendees, and tickets. Staff can check in tickets
only for events to which they are currently assigned; this is rechecked by the
server.

## Tickets: `/api/tickets`

| Method and path | Access | Request | Success / behavior |
|---|---|---|---|
| `GET /:ticketId.pdf` | Authenticated ticket owner or admin | Ticket MongoDB ID | Private, no-store `application/pdf` attachment generated in memory. Ticket must be active and its booking confirmed. |
| `POST /check-in` | Authenticated admin or Event Staff | `{ticketReference:"EH-TKT-<32 uppercase hex characters>"}` | 200 `{code:"checked_in",message,ticket:{attendeeName,eventTitle,attendeeNumber,checkedInAt}}`. |

Check-in verifies ticket state, booking eligibility, and Event Staff assignment
on the server. An atomic conditional update on active ticket plus unchecked
state permits only one concurrent success. It records server `checkedInAt`
and authenticated `checkedInBy`; no event-date validity window is applied.
Common check-in errors are 400 `invalid_ticket_reference`, 401
authentication failure, 403 `check_in_forbidden` or `event_not_assigned`, 404
`ticket_not_found`, 409 `already_checked_in`, `ticket_void`,
`booking_cancelled`, `booking_expired`, `booking_ineligible`, or
`ticket_unavailable`, and 500 `check_in_failed`.

The QR payload is only the opaque ticket reference. The scanner submits it to
this endpoint and displays the server response; it does not decide validity.
The browser requests camera access only after scanning starts and stops the
scanner during cleanup.

## Maintenance authorization

`GET /api/bookings/maintenance/expire` expects `Authorization: Bearer <CRON_SECRET>`.
`CRON_SECRET` must be at least 16 characters. The endpoint is not intended for
browser clients. Vercel schedules it every 15 minutes; other hosts need an
equivalent scheduler. See [`DEPLOYMENT.md`](DEPLOYMENT.md) and
[`RESERVATION_POLICY.md`](RESERVATION_POLICY.md).

## Not implemented

There are no payment gateway, webhook, payment reconciliation, refunds,
automated ticket expiry, event-date check-in window, or separate organizer
routes. `/payment-success` and `/payment-failed` are client pages only and do
not represent a live payment integration.
