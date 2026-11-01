# Feature Checklist

This is an implementation inventory, not a deployment/release sign-off.
Automated coverage and manual checks are tracked separately in
[`TEST_PLAN.md`](TEST_PLAN.md).

## Implemented in the current source

- [x] React/Vite client, Express API, Mongoose persistence, Vite `/api` proxy.
- [x] Public event list/detail, title search, category filter, admin event CRUD.
- [x] User signup, email OTP verification, login, JWT session validation,
      password reset, session-version invalidation.
- [x] Roles: `user`, `event_staff`, `admin`; server-side authorization.
- [x] Admin-designated Event Staff with unique event assignments and scoped
      event reads/check-in access.
- [x] Single and multi-attendee booking, server-calculated amount, free
      auto-confirmation, paid reservation and admin approval.
- [x] Reservation expiry/reconciliation, cancellation/rejection, idempotent
      capacity release for legacy and current reservations.
- [x] Idempotent ticket issuance, private PDF download, opaque-reference QR,
      server-side atomic check-in.
- [x] OTP, password-reset, confirmed-booking emails and mocked mail transport
      tests; optional custom SMTP with legacy Gmail compatibility.
- [x] Backend and client utility automated tests, client build and lint scripts.

## Operational verification still required per environment

- [ ] Verify schema-declared indexes in each target MongoDB database.
- [ ] Rehearse a test-inbox SMTP send using the intended provider.
- [ ] Verify deployment routes, secrets, CORS, cron execution, and production
      smoke tests in an authorized environment.
- [ ] Review current lint findings and any remaining test/build failures before
      release.
- [ ] Prepare approved, backed-up data/index migration plan before a live
      database transition.

## Deferred next-version scope

- [ ] Full-site UX redesign and consistency pass.
- [ ] Real online payment gateway integration.
- [ ] Gateway payment verification, webhooks, and reconciliation.
- [ ] Refunds and any other feature not represented by current routes.

Do not mark operational checks complete based only on local mocks or schema
declarations. Manual admin selection of `paid` is not payment verification.
