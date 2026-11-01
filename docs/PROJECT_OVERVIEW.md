# EventHub Project Overview

## Current product

EventHub is a MERN web application for discovering events and managing
multi-attendee bookings. The current branch includes account verification,
password recovery, event management, seat reservations, administrative paid-
booking approval, ticket PDFs with QR codes, and Event Staff check-in.

The project is general-purpose. Its roles are `user`, `event_staff`, and
`admin`; there is no separate organizer role. Admins currently create and
manage events. Event Staff gain scoped access through explicit event
assignments.

## User journeys

- Visitors browse/search events, register using an emailed OTP, and verify the
  account. Unverified accounts cannot obtain a login session.
- A verified user requests a booking OTP and submits event, quantity, and
  attendee details. The server calculates price and reserves capacity.
- Free bookings confirm and receive attendee tickets immediately. Paid
  bookings remain pending for up to 24 hours; an admin confirms them and
  selects an admin-recorded `paid` or `not_paid` status.
- A booking owner downloads their ticket PDF. Event Staff scan the QR code and
  the server verifies and records check-in. Admins can access any event;
  Event Staff are limited to current assignments.

## Architecture and source of truth

The React/Vite client calls the Express API. MongoDB persists users, events,
bookings, assignments, reset records, OTPs, and tickets. The backend is the
source of truth for access, price, capacity, booking status, ticket
eligibility, and check-in. See [`ARCHITECTURE_AND_STRUCTURE.md`](ARCHITECTURE_AND_STRUCTURE.md),
[`API_CONTRACT.md`](API_CONTRACT.md), and [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

## Current limitations

- Admin approval records a payment status manually. There is no real online
  gateway, gateway verification, webhook, or payment reconciliation.
- A full-site UX redesign and consistency pass is deferred.
- Reservation workflows are recoverable but not cross-document atomic; the
  app does not rely on MongoDB transactions.
- No event-date ticket validity window or automated ticket expiry is defined.
- Email tests use a mocked transport. Provider acceptance and inbox delivery
  require separate manual testing.
- The repository does not verify deployed hosts, production environment
  values, production database name, or actual database index state.

## Deferred next-version features

The next planned version may include a full-site UX redesign and real online
payment integration. Payment verification, gateway webhooks, and reconciliation
must be designed with the chosen provider. These are future work, not part of
the current scope; the current admin-selected `paid` value is not gateway-
verified. See [`DEVELOPMENT_ROADMAP.md`](DEVELOPMENT_ROADMAP.md).
