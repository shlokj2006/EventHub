# Local Setup, Environment, and Deployment

## Prerequisites

- Node.js and npm versions compatible with the locked client/server packages.
- A MongoDB instance reserved for local development.
- An SMTP sandbox or local mail catcher only if testing email flows.

The repository includes hosting configuration in `vercel.json`, but its
presence does not prove a deployment exists or that a target platform is
configured. The file routes `/api/*` to the `server/` service, other paths to
the `client/` service, and schedules booking maintenance every 15 minutes.

## Local development

1. Copy `server/.env.example` to `server/.env` without overwriting an existing
   file. For example, in PowerShell:

   ```powershell
   Copy-Item server/.env.example server/.env -NoClobber
   ```

2. Configure `MONGODB_URI` to a local development database, for example
   `mongodb://127.0.0.1:27017/eventhub_dev`. Configure a private `JWT_SECRET`.
   Never print or commit the real `.env` values.
3. Install packages and start the client and server:

   ```powershell
   npm install
   npm run install:all
   npm run dev
   ```

   The Vite client uses `http://localhost:5173` and proxies `/api` to the
   Express API on port 5000. The backend runs `node index.js` through Nodemon.
   The server loads `server/.env` relative to its own directory. To run one
   process, use `npm run dev:client` or `npm run dev:server` from the root.

`MONGODB_URI` is required for the Express server to start. No local or
production database connection was made during this documentation update.

## Environment variables

| Variable | Consumer | Requirement and behavior |
|---|---|---|
| `PORT` | `server/index.js` | Optional; defaults to `5000`. |
| `MONGODB_URI` | Server, seed, migration script | Required by the server. For development-only seed/index work, use a loopback URI and `eventhub_dev`; never point those scripts at production. |
| `JWT_SECRET` | Auth controller and JWT middleware | Required to sign and verify application JWTs. Keep private and stable for the deployment. |
| `FRONTEND_URL` | Password reset and CORS allowlist | Optional; reset links default to `http://localhost:5173`. Set the public frontend origin in deployment. |
| `EMAIL_USER` | Shared Nodemailer service | Sender/authentication user for verification, booking OTP, reset, and confirmation messages. |
| `EMAIL_PASS` | Shared Nodemailer service | Password or provider credential for `EMAIL_USER`; never commit it. |
| `SMTP_HOST` | Shared Nodemailer service | Optional custom SMTP host. Must be used with `SMTP_PORT` and `SMTP_SECURE`. |
| `SMTP_PORT` | Shared Nodemailer service | Optional custom SMTP port; validated as an integer from 1 to 65535. |
| `SMTP_SECURE` | Shared Nodemailer service | Optional custom mode, exactly `true` or `false`; true uses implicit TLS, false permits the provider's STARTTLS flow. Certificate verification is not disabled. |
| `CRON_SECRET` | `/api/bookings/maintenance/expire` | Required for maintenance; at least 16 characters and supplied only as a bearer secret to the scheduler. |
| `VITE_API_URL` | Client build | Optional. Defaults to relative `/api`; set the deployed API base including `/api` when client and API have separate origins. Do not put secrets in `VITE_*` variables. |
| `NODE_ENV` | Seed and index migration | The seed and one-time index script require exact `development`; it is not a general server configuration gate. |

If all custom `SMTP_*` variables are absent or blank, the mail service uses the
legacy Nodemailer Gmail service with `EMAIL_USER` and `EMAIL_PASS`. If any
custom SMTP value is supplied, all three must be valid. A successful
`sendMail()` result indicates provider acceptance, not delivery to the inbox.
The repository's `server/.env.example` contains placeholders only. There is no
client environment example file; `VITE_API_URL` is the only client environment
variable read by source.

## Email testing and failure behavior

For safe local tests, use an SMTP sandbox account you control or a local mail
catcher, and configure its host, port, TLS mode, user, and password in the
local `server/.env`. Restart the backend after environment changes. Test signup
verification, unverified-login OTP retry, booking OTP, password reset, and a
confirmed booking with multiple attendees. Never use production credentials
for development or paste credentials into chat.

Mailer tests use a mocked Nodemailer transport; they test template contents,
transport options, success/failure handling, and PDF attachment behavior at
the service boundary. They do not connect to an SMTP provider. Booking email
failure does not undo confirmation or ticket issuance. Booking delivery state
uses bounded retries from the protected maintenance endpoint. SMTP acceptance
can be ambiguous on timeout; exactly-once delivery cannot be guaranteed.
Password reset requests return a generic response; a mail/configuration error
returns generic 503. OTP endpoints return a retryable failure rather than
claiming the code was sent.

## Deployment configuration

The current `vercel.json` declares a `client` service rooted at `client/`, a
`server` service rooted at `server/`, rewrites `/api/(.*)` to the server and
other paths to the client, and a 15-minute cron for
`/api/bookings/maintenance/expire`. Verify the hosting account, deployment
environment, route behavior, and plan support before relying on that cron.
For other hosting, configure an authenticated scheduler request with
`Authorization: Bearer <CRON_SECRET>`.

Set deployment environment variables in the hosting provider's protected
settings. Do not expose `MONGODB_URI`, `JWT_SECRET`, `EMAIL_PASS`, or
`CRON_SECRET` to the frontend. `VITE_API_URL` is public build-time
configuration and must not contain credentials. Configure CORS origins and
`FRONTEND_URL` for the actual frontend host. The repository does not establish
the live database name, deployed host, provider limits, or production env
values; verify those from the deployment itself without disclosing secrets.

## Local seed and database migration safety

The seed script is explicitly for development. It requires `NODE_ENV=development`,
a loopback MongoDB host, a development database name (including
`eventhub_dev`), and the EventStaffAssignment unique index. Its fixture logic
uses preflight checks and reuses compatible fixture accounts, events, bookings,
assignments, and tickets. It may create demo records and reserve capacity for
new demo bookings. Conflicts stop without overwriting the conflicting fixture
record. It checks duplicate assignment pairs but does not replace the
migration's malformed-record preflight. It must never be run against
production.

`server/scripts/createEventStaffAssignmentUniqueIndex.js` is a one-time,
development-only index migration that strictly targets local
`eventhub_dev`. It checks malformed assignments, duplicates, and conflicting
indexes and creates only the required unique index. This documentation task
did not run it. See [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) for the exact
command, constraints, and Compass verification steps.

The local development database is named `eventhub_dev`. The main/production
database name and its hosting environment are unknown from repository files;
verify them in deployment configuration rather than guessing. A Git merge
does not merge MongoDB data. Any future production transition requires a
verified backup, a rehearsed data migration/reconciliation plan, preserved
user relationships, and explicit review. Never delete or rewrite data or
indexes without specific authorization.

## Verification commands

```powershell
npm test --prefix server
node --test --test-concurrency=1 client/test/*.test.js
npm run build --prefix client
npm run lint --prefix client
```

The client tests are Node built-in tests under `client/test/`. The current
client lint command covers the whole client and may report existing issues;
report its actual result. The API and database test suites use mocks and do not
prove SMTP delivery or deployed MongoDB index state.
