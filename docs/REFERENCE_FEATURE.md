# Reference Flow: Booking and Capacity

This describes the current booking implementation, not the earlier proposed
Registration model. A booking is the registration record. See
[`RESERVATION_POLICY.md`](RESERVATION_POLICY.md) for the recoverable capacity
workflow and [`API_CONTRACT.md`](API_CONTRACT.md) for request shapes.

## Flow

1. A verified user requests a booking OTP with `POST /api/bookings/send-otp`.
2. The user submits `POST /api/bookings` with event ID, OTP, optional
   positive-integer quantity, and matching attendee information.
3. The server validates the OTP and event, checks existing booking state,
   calculates total from server-side event price, and creates a pending
   `reserving` booking.
4. An atomic Event-document update decrements `availableSeats` and creates a
   capacity claim. A failed/ambiguous write remains recoverable by maintenance.
5. A free booking becomes confirmed/consumed immediately, issues one ticket
   per attendee, and attempts booking confirmation mail.
6. A paid booking remains pending/reserved for 24 hours. An admin confirms it
   with `paid` or `not_paid`; approval consumes the held capacity without a
   second decrement, issues tickets, and attempts confirmation mail.
7. Cancellation, admin rejection, or expiry marks the booking non-approvable,
   releases the claim once, and voids active tickets.

## Integrity and privacy

- The client does not supply a trusted price or total.
- Users cannot access another user's booking history or ticket PDFs.
- `paid` is an admin-entered status, not proof of external payment.
- Email goes only to the verified booking owner's stored account email; each
  attendee ticket PDF is attached after confirmed ticket issuance.
- Reservation writes are not cross-document transactions. A maintenance
  request reconciles interrupted transitions.
- Tests use mocked model/service behavior and do not replace MongoDB
  integration testing.

## Checks

- [ ] Verify free booking auto-confirmation and per-attendee tickets.
- [ ] Verify both admin payment-status choices and unchanged reserved seats.
- [ ] Test invalid quantity, attendee mismatch, expired OTP, and no capacity.
- [ ] Test cancellation/expiry release idempotency and ticket voiding.
- [ ] Verify user ownership and admin-only approval.
- [ ] Test email failure without booking rollback.
