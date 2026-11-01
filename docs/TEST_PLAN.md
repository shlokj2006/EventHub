# Test Plan and Verification

## Automated checks

From the repository root:

```powershell
npm test --prefix server
Push-Location client
node --test
Pop-Location
npm run build --prefix client
npm run lint --prefix client
```

The server's `test` script runs Node's built-in test runner over `server/test/`.
The client has no npm test script; its utility tests are in `client/test/` and
run with `node --test` from `client/`. The client lint script runs ESLint on
all client files. There is no server lint script; use `node --check` for
changed CommonJS files or configure a lint system separately without implying
that a syntax check is a lint run.

Automated coverage currently includes booking validation/reservation races,
ownership and authorization, ticket issuance and check-in, scanner result
mapping, password reset, mail transport mocks, event staff permissions, and
seed/migration safety guards. Most backend controller tests use mocks. They do
not replace a MongoDB integration test or establish indexes on any database.
Mailer tests do not send real SMTP messages.

## Manual test setup

Use only an isolated development database and test inboxes you control. Do not
run the seed or migration against production. For SMTP checks, use a local mail
catcher or disposable sandbox. Record environment names and test outcomes, but
never record credentials, OTP values, reset tokens, ticket QR payloads, or
personal attendee data in shared reports.

## Manual checklist

### Authentication and account recovery

- [ ] Register a new account; verify it receives an account OTP and can verify.
- [ ] Attempt registration with an existing email; confirm no second account.
- [ ] Sign in as an unverified account; verify it is not issued a JWT and a
      fresh OTP can be requested. Simulate mail failure and confirm a retryable
      error without exposing provider details.
- [ ] Sign in with valid and invalid credentials; confirm the database role
      determines the destination and permissions.
- [ ] Request password reset for existing and unknown addresses; confirm the
      response is generic and rate limits apply.
- [ ] Complete a valid reset; verify old sessions are rejected, the token
      cannot be reused, and an expired token fails.

### Events, bookings, and capacity

- [ ] Browse/search events without a session; test category and title search.
- [ ] Confirm Event Staff public event browsing is restricted to assignments.
- [ ] Verify only an admin can create, update, or delete events.
- [ ] Request booking OTP, then submit a free booking. Confirm it immediately
      and verify one active ticket per attendee.
- [ ] Submit a paid multi-attendee booking; verify capacity is held once and
      status remains pending until admin approval.
- [ ] Approve the paid booking as `paid` and another as `not_paid`. Confirm
      booking/payment status remain separate and capacity is not decremented a
      second time. Remember `paid` is admin-recorded, not gateway-verified.
- [ ] Test missing/invalid OTP, nonpositive/fractional quantity, mismatch
      between attendee count and quantity, invalid attendee details, full
      capacity, duplicate active booking, and concurrent capacity claims.
- [ ] Verify users see only their own booking history and cannot cancel
      another user's booking. Verify admin cancellation of pending bookings is
      recorded as rejection.
- [ ] Verify expiry after 24 hours, cancellation, rejection, and maintenance
      reconciliation release capacity once and void tickets where applicable.

### Event Staff and tickets

- [ ] Designate an existing verified user from the admin dashboard; verify
      role change invalidates their previous session.
- [ ] Assign staff to one event; confirm assigned and unassigned event reads
      and check-in requests are restricted correctly.
- [ ] Download a ticket PDF as its owner; reject a different user and permit
      explicit admin access. Confirm QR code and reference are present.
- [ ] Scan a valid ticket; confirm the server records the actor and time.
- [ ] Scan the same ticket again and concurrently from two clients; exactly
      one first check-in should succeed.
- [ ] Confirm void tickets and tickets for pending, cancelled, expired, or
      otherwise ineligible bookings are rejected.
- [ ] Deny camera permission and test unavailable camera and scanner cleanup.

### Email delivery

- [ ] Test signup verification, login OTP, booking OTP, password reset,
      successful-reset notification, and confirmed-booking confirmation.
- [ ] Confirm multi-attendee bookings attach a separate PDF for each ticket.
- [ ] Simulate missing/partial configuration and SMTP authentication/connection
      failures; ensure failures are reported safely and booking state is not
      rolled back.
- [ ] Confirm the mail provider accepted a test message separately from
      confirming inbox delivery. Do not claim real SMTP behavior from mocks.

## Known verification boundaries

- Tests in `server/test/` are not a deployed MongoDB integration suite.
- Schema-declared indexes must be verified in each target database; see
  [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).
- Client lint may currently report unused `React` imports in
  `PaymentFailed.jsx` and `PaymentSuccess.jsx`; these are pre-existing client
  lint findings and do not imply those pages implement payment processing.
- Deployment smoke tests require a separately verified non-production or
  authorized environment. Do not use production data for test cases.
