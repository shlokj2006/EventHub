# EventHub

EventHub is a MERN event discovery and booking application. It supports
verified user accounts, administrator-managed events and bookings,
event-specific staff access, multi-attendee tickets, PDF downloads, QR-based
check-in, and email notifications. The current repository state is on
`feature/eventhub-booking-tickets`. This describes repository implementation,
not a claim that the application is deployed or release-approved.

## Current scope

- Public users can browse and search events, sign up, verify their email, and
  book events.
- Free bookings confirm immediately. Paid bookings reserve seats for 24 hours
  and require an administrator to confirm them, recording `paid` or `not_paid`
  as a manual status. There is no payment gateway or gateway verification.
- Confirmed bookings issue one ticket per attendee. Owners can download their
  PDF tickets; admins can download tickets explicitly. Admins and assigned
  Event Staff can check tickets in through the server-verified scanner.
- Admins manage event records, approve bookings, and designate/assign/revoke
  Event Staff. There is no separate organizer role.

The current implementation and known limits are documented in
[`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md). See
[`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) for routes and
[`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) for model/index details.

## Local development

Prerequisites: Node.js compatible with the locked Vite version, npm, and a
MongoDB instance used only for development. Create `server/.env` from
`server/.env.example`, provide a development `MONGODB_URI` and `JWT_SECRET`,
and configure email only if testing mail delivery. Keep credentials out of
Git. The server loads `server/.env` relative to its own directory.

```powershell
npm install
npm run install:all
npm run dev
```

The root `dev` script starts the Vite client and Express server concurrently.
Vite serves the client at `http://localhost:5173` and proxies `/api` to
`http://localhost:5000`. To run one side separately, use `npm run dev:client`
or `npm run dev:server`. `npm run build` builds the client and `npm run lint`
runs the client ESLint checks. Backend tests run with:

```powershell
npm test --prefix server
```

For client production hosting, set `VITE_API_URL` to the API base including
`/api`; otherwise the client uses relative `/api` URLs. See
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for environment and hosting details.

## Documentation map

- [Architecture and structure](docs/ARCHITECTURE_AND_STRUCTURE.md)
- [API contract](docs/API_CONTRACT.md)
- [Booking reservation policy](docs/RESERVATION_POLICY.md)
- [Database schema and index safety](docs/DATABASE_SCHEMA.md)
- [Deployment and environment setup](docs/DEPLOYMENT.md)
- [Test plan and verification](docs/TEST_PLAN.md)
- [Feature requirements and current scope](docs/FEATURES_AND_REQUIREMENTS.md)
- [Project overview](docs/PROJECT_OVERVIEW.md)
- [Technology stack](docs/TECH_STACK.md)

The older tutorial-era images in `docs/fc.png` and `docs/dfd.png` are retained
as historical drafts; they are not current process diagrams. Use the Mermaid
diagrams in the architecture and reservation documents.

## Future version

A full-site UX redesign and real online payment processing—including gateway
verification, webhooks, and reconciliation—are deferred. Manual admin payment
status recording is not payment processing. See
[`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md).
