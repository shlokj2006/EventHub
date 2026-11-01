# EventHub

### Event Management, Booking & Digital Ticketing Platform

EventHub is a full-stack event management and ticket-booking platform built using the MERN stack. It provides an integrated solution for managing events, handling reservations, issuing digital tickets, validating QR codes, and managing event staff.

The platform supports users, administrators, and event staff through role-based access control and dedicated workflows.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Security Features](#security-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Application Architecture](#application-architecture)
- [Booking and Reservation Workflow](#booking-and-reservation-workflow)
- [Digital Ticketing](#digital-ticketing)
- [Environment Configuration](#environment-configuration)
- [Installation and Local Development](#installation-and-local-development)
- [Testing and Quality Checks](#testing-and-quality-checks)
- [Deployment](#deployment)
- [Database Environments](#database-environments)
- [Important Security Notes](#important-security-notes)

---

## Overview

EventHub is designed to simplify event organization and attendee management.

The platform provides:

- Event discovery and event management.
- User registration and authentication.
- Booking and reservation management.
- Booking approval and cancellation.
- Digital ticket generation.
- QR-code-based ticket validation.
- Event-specific staff management.
- Email-based account verification and password recovery.
- Administrative controls and role-based permissions.

The application uses React for the frontend, Node.js and Express.js for backend APIs, and MongoDB for persistent data storage.

## Features

### 1. User Authentication and Accounts

- User registration and login.
- JWT-based authentication.
- Role-based access control.
- Account verification using OTP.
- Email-based password recovery.
- Secure password-reset links.
- Session-aware frontend navigation.
- Input validation during registration and authentication.

### 2. Event Management

- Browse available events.
- View individual event details.
- Create and manage events through authorized accounts.
- Update event information.
- Delete events through authorized operations.
- Manage event capacity and availability.
- Dedicated administrative event-management interface.

### 3. Booking and Reservation Management

- Book event tickets.
- Validate booking requests.
- Support repeat bookings.
- Verify booking requests through OTP.
- View booking information.
- Cancel eligible bookings.
- Administrative booking approval.
- Reservation expiry for pending paid bookings.
- Seat reservation and release management.
- Booking confirmation email workflows.

### 4. Digital Tickets

- Automatic digital ticket issuance.
- Unique ticket references.
- Attendee-level ticket tracking.
- Ticket PDF generation.
- Ticket-related email delivery.
- Authorized ticket access.
- QR-code-based ticket validation.

### 5. QR Ticket Scanning

EventHub includes a dedicated ticket-scanning interface.

Features include:

- QR-code scanning workflow.
- Ticket validation through backend APIs.
- Authorization checks for scanning operations.
- Ticket verification for event entry.

Only appropriately authorized users should perform ticket-scanning operations.

### 6. Event Staff Management

Administrators and authorized event managers can manage event-specific staff assignments.

Features include:

- Event staff assignment.
- Staff management interface.
- Dedicated event staff dashboard.
- Event-specific permission checks.
- Protected staff-management operations.
- Unique user-event assignment constraints.

### 7. Email Notifications

Email functionality supports:

- Account verification.
- Password-reset instructions.
- Booking confirmation workflows.
- Digital ticket delivery.

Email delivery uses the configured email transport, including Nodemailer.

---

## Security Features

Security improvements were introduced across authentication, API handling, booking workflows, and access control.

### 1. Password Security

- Passwords are hashed using bcrypt before storage.
- Password hashes are not returned through authentication API responses.
- Registration includes password-length validation.
- Password-reset tokens are stored as hashes.

### 2. Secure OTP Generation

OTP generation uses Node.js `crypto.randomInt()` rather than `Math.random()`.

This provides cryptographically secure random-number generation.

OTP values are six digits long, including support for leading zeros.

### 3. OTP Expiry and Verification

- OTPs have a five-minute expiry period.
- OTP verification consumes codes using atomic database operations.
- Consumed OTPs cannot normally be reused.
- Booking OTP handling includes safeguards for known validation failures.

### 4. Authentication Rate Limiting

Rate limiting protects important authentication and OTP endpoints against excessive requests.

The implemented limits use 15-minute windows:

| Operation | Account limit | IP limit |
|---|---:|---:|
| Login | 10 | 60 |
| Signup | 5 | 30 |
| Booking OTP send | 5 | 30 |
| OTP verification | 10 | 60 |

Requests exceeding the configured limits receive HTTP `429 Too Many Requests` responses with a `Retry-After` header.

**Implementation limitation:** Rate limits are maintained in application memory. They are best-effort and do not provide shared enforcement across multiple serverless instances or application restarts.

### 5. Role-Based Access Control

- Authentication middleware protects restricted operations.
- Authorization checks distinguish between user roles.
- Booking ownership is checked.
- Event modification and deletion require appropriate permissions.
- Event staff operations use event-specific permission checks.
- Ticket-scanning operations are protected.

### 6. HTTP Security Headers

The backend integrates Helmet to apply security-related HTTP response headers.

These include protections such as:

- Content Security Policy.
- MIME-type sniffing protection.
- Clickjacking-related frame restrictions.
- Referrer policy.
- Cross-origin security headers.
- HTTP Strict Transport Security header configuration.

### 7. API Information Protection

- Public event responses expose organizer names without unnecessarily exposing organizer email addresses.
- Password hashes are excluded from user-facing authentication responses.
- Password-reset token hashes are not exposed.
- Raw reset tokens are delivered through the intended reset-email workflow rather than API responses.

### 8. Safer Error Handling

Unexpected server errors are logged server-side.

Client responses use generic error messages instead of unnecessarily exposing internal error details or stack traces.

### 9. Protected Reservation Maintenance

The scheduled reservation-expiry endpoint uses `CRON_SECRET` authentication.

Reservation expiry and seat-release operations include checks to prevent repeated seat releases.

---

## Technology Stack

| Category | Technology |
|---|---|
| Frontend | React |
| Frontend build tool | Vite |
| Backend | Node.js |
| Backend framework | Express.js |
| Database | MongoDB |
| Database modelling | Mongoose |
| Authentication | JSON Web Tokens |
| Password hashing | bcrypt |
| HTTP security | Helmet |
| HTTP client | Axios |
| Frontend routing | React Router |
| Email delivery | Nodemailer |
| Secure OTP generation | Node.js Crypto |
| Automated testing | Node.js built-in test runner |
| Code quality | ESLint |
| Version control | Git |
| Source hosting | GitHub |
| Deployment | Vercel |

---

## Project Structure

The repository is organized into frontend, backend, documentation, and configuration directories.

```text
EventHub/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── TicketScanner.jsx
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── EventDetail.jsx
│   │   │   ├── EventStaffDashboard.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── PaymentFailed.jsx
│   │   │   ├── PaymentSuccess.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── ResetPassword.jsx
│   │   │   ├── StaffManagement.jsx
│   │   │   └── UserDashboard.jsx
│   │   │
│   │   ├── utils/
│   │   └── App.jsx
│   │
│   ├── test/
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── eventController.js
│   │   ├── eventStaffController.js
│   │   └── ticketController.js
│   │
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── authRateLimit.js
│   │   ├── cronAuth.js
│   │   └── passwordResetRateLimit.js
│   │
│   ├── models/
│   │   ├── Booking.js
│   │   ├── Event.js
│   │   ├── EventStaffAssignment.js
│   │   ├── PasswordReset.js
│   │   ├── Ticket.js
│   │   └── User.js
│   │
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── test/
│   ├── utils/
│   ├── index.js
│   └── package.json
│
├── docs/
│   ├── API_CONTRACT.md
│   ├── ARCHITECTURE_AND_STRUCTURE.md
│   ├── DATABASE_DESIGN.md
│   ├── DATABASE_SCHEMA.md
│   ├── DEPLOYMENT.md
│   ├── RESERVATION_POLICY.md
│   └── ...
│
├── vercel.json
└── README.md
```

This is a representative structure highlighting the main application components. Additional utility, route, service, test, and documentation files are included in the repository.

---

## Application Architecture

EventHub follows a three-layer MERN architecture.

### Frontend

The React application provides:

- User interfaces.
- Authentication and session handling.
- Event discovery and management.
- Booking workflows.
- Digital ticket display.
- Ticket-scanning interface.
- Administrative and staff dashboards.

### Backend

The Express.js API provides:

- Authentication and authorization.
- Event management.
- Booking and reservation operations.
- Ticket generation and verification.
- Staff management.
- Email workflows.
- Reservation maintenance.

### Database

MongoDB stores application data through Mongoose models.

The main collections include:

- Users.
- Events.
- Bookings.
- Tickets.
- Event staff assignments.
- Password reset records.

---

## Booking and Reservation Workflow

EventHub implements a reservation workflow designed to manage event capacity safely.

The general workflow is:

1. A user selects an event.
2. The user submits a booking request.
3. Required validation and authorization checks are performed.
4. Booking OTP verification is completed where required.
5. The reservation system manages available event capacity.
6. Eligible paid reservations remain reserved while awaiting approval.
7. Free bookings follow the immediate capacity-consumption workflow.
8. Authorized administrators can approve pending bookings.
9. Booking confirmation and ticket issuance workflows follow the applicable booking state.

### Reservation expiry

Pending paid reservations use a 24-hour approval window.

A scheduled maintenance process runs daily at midnight UTC (approximately 5:30 AM IST).

Expired reservations are cancelled and their reserved capacity is released.

The approval logic also checks reservation expiry, preventing late approval.

The scheduled cleanup can occur up to approximately 24 hours after the expiry threshold.

---

## Digital Ticketing

Tickets are generated through the backend ticket issuance workflow.

The system defines unique ticket-reference and booking-attendee index constraints.

Ticket records are associated with bookings and attendees.

The ticket workflow supports:

- Ticket creation.
- Unique ticket identification.
- PDF generation.
- Email delivery.
- QR-code validation.
- Authorized scanning.

---

## Environment Configuration

The backend requires environment variables for database connectivity, authentication, email delivery, and frontend integration.

Create a local environment file using the provided example configuration.

### Backend environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `FRONTEND_URL` | Frontend application origin |
| `EMAIL_USER` | Email account |
| `EMAIL_PASS` | Email account password or app password |
| `SMTP_HOST` | Optional custom SMTP hostname |
| `SMTP_PORT` | Optional SMTP port |
| `SMTP_SECURE` | Optional SMTP TLS configuration |
| `CRON_SECRET` | Scheduled maintenance authentication secret |
| `PORT` | Optional local backend port |
| `NODE_ENV` | Application environment |

### Frontend environment variable

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Optional backend API base URL; defaults to `/api` |

Use the example files:

- `server/.env.example`
- `client/.env.example`, if present in the repository.

**Never commit real `.env` files or expose database credentials, JWT secrets, email passwords, or cron secrets.**

---

## Installation and Local Development

### Prerequisites

Install:

- Node.js.
- npm.
- Git.
- MongoDB local installation or a MongoDB Atlas development database.

### 1. Clone the repository

```bash
git clone https://github.com/shlokj2006/EventHub.git
cd EventHub
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure backend environment

Create a local `server/.env` file based on `server/.env.example`.

Configure your local development database and the required authentication and email settings.

Do not use Production database credentials for local development.

### 4. Start the backend

```bash
npm start
```

Use the backend development script defined in `server/package.json` if you want to run the development server with Nodemon.

### 5. Install frontend dependencies

Open another terminal:

```bash
cd client
npm install
```

Configure the frontend environment if your local setup requires a custom API URL.

### 6. Start the frontend

```bash
npm run dev
```

Vite will display the local frontend URL in the terminal.

---

## Testing and Quality Checks

### Backend automated tests

From the `server` directory:

```bash
npm test
```

The reported completed development test run passed:

**103 tests passed, 0 failed.**

### Frontend tests

From the `client` directory:

```bash
node --test
```

The reported completed frontend test run passed:

**9 tests passed, 0 failed.**

### Frontend lint

```bash
npm run lint
```

### Frontend production build

```bash
npm run build
```

The frontend lint and production build passed during the final development verification.

### Dependency audit

Run:

```bash
npm audit
```

The client audit reported zero vulnerabilities at the time of the final review.

The server audit reported two moderate development-dependency findings associated with Nodemon and minimatch. Review current audit results before future releases.

---

## Deployment

EventHub is deployed using Vercel.

The GitHub repository is connected to the Vercel project.

The `main` branch is configured for Production deployment, while the feature branch is used for Preview deployment.

### Deployment routing

The `vercel.json` configuration handles:

- Backend API routing under `/api/*`.
- Frontend application routing.
- Scheduled reservation maintenance.

### Cron configuration

The scheduled reservation-maintenance job uses:

```json
{
  "path": "/api/bookings/maintenance/expire",
  "schedule": "0 0 * * *"
}
```

This schedule corresponds to midnight UTC or approximately 5:30 AM IST.

The endpoint requires the configured `CRON_SECRET`.

### Environment separation

Preview and Production use separate MongoDB databases.

See [Database Environments](#database-environments).

---

## Database Environments

The project uses separate databases to avoid mixing development, testing, and Production records.

| Database | Environment |
|---|---|
| `eventhub_dev` | Local development |
| `eventhub_preview` | Vercel Preview |
| `eventhub_demo` | Vercel Production |
| `EVENTHUB` | Previous Production database, preserved separately |

The current deployment configuration is intended to use:

- Preview → `eventhub_preview`
- Production → `eventhub_demo`

The previous `EVENTHUB` database is preserved and is not the active Production database.

**Do not run development seed scripts against Atlas Production.**

---

## Important Security Notes

- Keep all secrets in environment variables.
- Never commit `.env` files.
- Never expose MongoDB connection strings or JWT secrets.
- Do not use Production credentials in development environments.
- Do not weaken authentication or authorization middleware for convenience.
- Do not run seed scripts against Production.
- Review database index compatibility before applying schema/index changes.
- Monitor deployment logs and email delivery.
- Keep Preview and Production database configurations separate.

The project includes important application-level security controls, but it has not been represented as independently penetration-tested or formally security-certified.

---

## Project Status

| Area | Status |
|---|---|
| MERN application | Implemented |
| Event management | Implemented |
| Authentication | Implemented |
| Booking and reservations | Implemented |
| Digital tickets | Implemented |
| QR ticket scanning | Implemented |
| Event staff management | Implemented |
| Password recovery | Implemented |
| OTP security improvements | Implemented |
| API security headers | Implemented |
| Automated backend tests | Passed |
| Frontend tests | Passed |
| Frontend lint | Passed |
| Production build | Passed |
| GitHub main branch deployment | Completed |
| Vercel Production deployment | Operational |
| Manual Production smoke testing | Pending |

---

## Repository

GitHub: https://github.com/shlokj2006/EventHub

**EventHub — Simplifying Event Management, Reservations, and Digital Ticketing.**
