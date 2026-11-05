# EventHub – Event Management, Booking & Digital Ticketing Platform

EventHub is a full-stack event management and digital ticketing platform built using the MERN stack. It provides a centralized system for discovering events, managing reservations, issuing digital tickets, and validating event entry through QR-code scanning.

The platform supports three types of users — **Users, Administrators, and Event Staff** — with role-based access and event-specific permissions.

**Live Demo:** https://eventhub-one-phi.vercel.app/  
**GitHub Repository:** https://github.com/shlokj2006/EventHub

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Application Workflow](#application-workflow)
- [Technology Stack](#technology-stack)
- [Project Architecture](#project-architecture)
- [Security](#security)
- [Reservation and Ticketing System](#reservation-and-ticketing-system)
- [Installation and Setup](#installation-and-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [Database Configuration](#database-configuration)
- [Project Status](#project-status)

---

## Overview

EventHub simplifies the process of organizing events and managing attendee reservations through a single platform.

Users can explore available events, make reservations, access their bookings, and receive digital tickets. Administrators can manage events, review reservations, and coordinate event staff. Event staff members receive event-specific access to support attendee verification and entry management.

The platform also incorporates email-based OTP verification, automated reservation expiry, PDF ticket generation, and QR-code validation to improve reliability and security throughout the booking process.

---

## Key Features

### 1. Authentication and Account Management

- User registration and login.
- JWT-based authentication.
- Role-based access control.
- Email OTP-based account verification.
- Secure password hashing using bcrypt.
- Forgot-password functionality.
- Password recovery through email reset links.
- Secure password reset token handling.
- Session-aware frontend navigation.
- Input validation and authentication rate limiting.

### 2. Event Management

- Browse and discover available events.
- View detailed event information.
- Authorized event creation and modification.
- Event deletion with permission checks.
- Event capacity and availability management.
- Administrative event management interface.

### 3. Booking and Reservation Management

- Reserve available event seats.
- Validate booking requests.
- OTP verification for applicable booking operations.
- View personal booking history.
- Cancel eligible reservations.
- Administrative booking approval.
- Automatic expiry of pending paid reservations.
- Automatic release of seats after reservation expiry.
- Booking confirmation email notifications.

### 4. Digital Ticketing System

- Generate digital tickets for confirmed bookings.
- Create unique ticket references.
- Associate tickets with bookings and attendees.
- Generate downloadable PDF tickets.
- Deliver digital tickets through email.
- Restrict ticket access to authorized users.
- Support QR-code-based ticket validation.

### 5. QR Code Scanning and Entry Validation

- Dedicated ticket-scanning interface.
- QR-code scanning through the application.
- Backend ticket validation.
- Authorization checks before ticket validation.
- Event-specific entry verification.
- Attendee tracking through ticket validation.

### 6. Event Staff Management

- Assign staff members to specific events.
- Dedicated event staff dashboard.
- Event-specific staff permissions.
- Restrict staff access to authorized events.
- Enforce unique user-event staff assignments.

### 7. Email Notifications

EventHub uses Nodemailer for transactional email delivery, including:

- Account verification OTPs.
- Password reset links.
- Booking confirmation notifications.
- Digital ticket delivery.

---

## User Roles

The application uses role-based authorization to separate responsibilities and restrict access to protected operations.

| Role | Responsibilities |
|---|---|
| User | Discover events, make bookings, manage reservations, and access digital tickets. |
| Administrator | Manage events, review bookings, approve eligible reservations, and manage event staff. |
| Event Staff | Access assigned event information and validate attendee tickets. |

Permissions are enforced on the backend rather than relying only on frontend navigation or visibility.

---

## Application Workflow

### User Booking Workflow

1. User registers or logs into the application.
2. User verifies their account when required.
3. User explores available events.
4. User selects an event and submits a booking request.
5. The backend validates the request and checks event availability.
6. OTP verification is performed where required.
7. The reservation is processed according to the event's booking policy.
8. Eligible paid reservations remain pending administrative approval.
9. Once the booking reaches the required confirmation state, the ticket-generation workflow can proceed.
10. The user receives the applicable confirmation and digital ticket through email.

### Ticket Verification Workflow

1. An authorized event staff member accesses the assigned event.
2. The staff member opens the ticket-scanning interface.
3. The attendee presents their digital ticket.
4. The QR code is scanned.
5. The backend validates the ticket and checks authorization.
6. The application processes the entry-validation result.

### Reservation Expiry Workflow

- Eligible paid reservations have a 24-hour administrative approval window.
- Pending reservations that exceed the approval period are expired.
- Expired reservations are cancelled.
- Reserved capacity is released.
- The maintenance process runs automatically through the configured scheduled deployment task.
- Approval operations also check reservation expiry.

---

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, Vite |
| Styling | CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JSON Web Tokens (JWT) |
| Password Security | bcrypt |
| API Communication | Axios |
| Routing | React Router |
| Email Services | Nodemailer |
| OTP Generation | Node.js Crypto |
| Security | Helmet, custom rate-limiting middleware |
| Testing | Node.js Built-in Test Runner |
| Code Quality | ESLint |
| Deployment | Vercel |
| Version Control | Git and GitHub |

---

## Project Architecture

EventHub follows a client-server architecture. The React frontend communicates with the Express backend through REST APIs, while MongoDB stores application data.

### Project Structure

```text
EventHub/
│
├── client/
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
│   │   └── ...
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
│   └── RESERVATION_POLICY.md
│
└── README.md
```

### Backend Architecture

The backend is organized into separate responsibilities:

- **Routes:** Define API endpoints.
- **Middleware:** Handle authentication, authorization, rate limiting, and request protection.
- **Controllers:** Process HTTP requests and responses.
- **Services:** Handle application-level business logic.
- **Models:** Define MongoDB schemas and database interactions.
- **Utilities:** Provide reusable helper functionality.

### Database Collections

The application uses MongoDB collections for:

- Users
- Events
- Bookings
- Tickets
- Event staff assignments
- Password reset records

---

## Security

Security is implemented across authentication, authorization, booking operations, ticket validation, and HTTP communication.

### Authentication and Password Protection

- Passwords are hashed using bcrypt.
- Password hashes are excluded from API responses.
- Password reset tokens are stored as hashes.
- Password reset tokens are generated and validated securely.
- Password length validation is applied.

### OTP Protection

- OTPs are generated using `crypto.randomInt()`.
- OTPs contain six digits, including possible leading zeros.
- OTPs expire after five minutes.
- OTP verification uses atomic consumption to prevent normal reuse.
- Booking OTP operations include additional safeguards.

### Rate Limiting

The documented in-memory rate limits include:

| Operation | Time Window | Limit |
|---|---:|---:|
| Login per account | 15 minutes | 10 |
| Login per IP | 15 minutes | 60 |
| Signup per IP | 15 minutes | 30 |
| Booking OTP send per IP | 15 minutes | 30 |
| OTP verification per IP | 15 minutes | 60 |

**Note:** These limits use in-memory storage. They are best-effort protections and are not shared across multiple serverless instances or preserved across restarts.

### Authorization and Data Protection

- Role-based access control.
- Booking ownership verification.
- Authorization checks for event modification and deletion.
- Event-specific staff permissions.
- Ticket-scanning authorization.
- Sensitive fields excluded from public API responses.
- Generic client-facing errors and server-side error logging.

### HTTP Security

Helmet is used to configure security-related HTTP headers, including:

- Content Security Policy.
- MIME-sniffing protection.
- Frame restrictions.
- Referrer policy.
- Cross-origin security headers.
- HTTP Strict Transport Security configuration.

---

## Reservation and Ticketing System

EventHub includes reservation lifecycle management to maintain event capacity accurately.

### Reservation Policy

- Free bookings consume available capacity according to the booking workflow.
- Eligible paid reservations remain pending administrative approval.
- Pending paid reservations have a 24-hour approval window.
- Expired reservations are cancelled.
- Released reservations return their seats to available event capacity.
- Approval logic checks expiry before processing an approval.
- Seat-release operations include safeguards against repeated release.

### Digital Tickets

Tickets are associated with bookings and attendees and use unique ticket references.

The ticketing system supports:

- Ticket generation.
- PDF ticket creation.
- Email delivery.
- Authorized ticket access.
- QR-code validation.
- Database constraints to protect ticket and attendee uniqueness.

---

## Installation and Setup

Follow these steps to run EventHub locally.

### Prerequisites

Make sure the following are installed:

- Node.js
- npm
- MongoDB Atlas account or local MongoDB installation
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/shlokj2006/EventHub.git
cd EventHub
```

### 2. Configure the Backend

```bash
cd server
npm install
```

Create a `.env` file inside the `server` directory using the available `.env.example` file as a reference.

Configure the required backend environment variables before starting the server.

### 3. Configure the Frontend

Open another terminal:

```bash
cd client
npm install
```

Create the frontend `.env` file if required, using the available frontend example configuration.

### 4. Start the Application

Start the backend and frontend separately using the commands below.

---

## Environment Variables

### Backend – `server/.env`

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used for JWT signing and verification |
| `FRONTEND_URL` | Frontend application URL |
| `EMAIL_USER` | Email account used for sending notifications |
| `EMAIL_PASS` | Email account password or app password |
| `SMTP_HOST` | Optional SMTP host |
| `SMTP_PORT` | Optional SMTP port |
| `SMTP_SECURE` | Optional SMTP secure connection setting |
| `CRON_SECRET` | Secret used to protect the reservation maintenance endpoint |
| `PORT` | Optional backend port |
| `NODE_ENV` | Application environment |

### Frontend – `client/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Optional backend API base URL; defaults to `/api` |

### Example Backend Configuration

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret

FRONTEND_URL=http://localhost:5173

EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password

CRON_SECRET=your_cron_secret

PORT=5000
NODE_ENV=development
```

### Example Frontend Configuration

```env
VITE_API_URL=http://localhost:5000/api
```

**Important:** Never commit `.env` files, database credentials, email passwords, JWT secrets, or other private configuration values to GitHub.

---

## Running the Application

### Backend

From the `server` directory:

```bash
npm start
```

Use the development script defined in `server/package.json` when running the backend in development mode.

### Frontend

From the `client` directory:

```bash
npm run dev
```

Vite will provide a local development URL, typically:

```text
http://localhost:5173
```

The frontend communicates with the backend through the configured API base URL.

---

## Testing

EventHub includes automated tests for backend and frontend functionality.

### Backend Tests

From the `server` directory:

```bash
npm test
```

### Frontend Tests

From the `client` directory:

```bash
node --test
```

### Frontend Linting

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

### Previously Reported Test Results

The repository documentation records the following results from its latest documented verification:

| Test Suite | Reported Result |
|---|---:|
| Backend tests | 103 passed, 0 failed |
| Frontend tests | 9 passed, 0 failed |
| Frontend lint | Passed |
| Frontend production build | Passed |

These are previously recorded results, not a guarantee that the tests have been rerun against the current checkout.

---

## Deployment

EventHub is deployed using Vercel and connected to the GitHub repository.

**Production URL:** https://eventhub-one-phi.vercel.app/

### Deployment Configuration

- GitHub repository connected to Vercel.
- `main` branch configured for Production deployments.
- Feature branches can generate Preview deployments.
- API requests are routed through the configured Vercel routing setup.
- Scheduled reservation maintenance is configured through the deployment platform.

### Reservation Maintenance Cron

The documented scheduled task uses:

```json
{
  "path": "/api/bookings/maintenance/expire",
  "schedule": "0 0 * * *"
}
```

This runs daily at midnight UTC, approximately 5:30 AM IST.

The maintenance endpoint is protected using `CRON_SECRET`.

Refer to `docs/DEPLOYMENT.md` for the deployment-specific configuration.

---

## Database Configuration

The project documentation distinguishes between local, Preview, and Production databases.

| Environment | Database |
|---|---|
| Local Development | `eventhub_dev` |
| Vercel Preview | `eventhub_preview` |
| Vercel Production | `eventhub_demo` |
| Previous Production Database | `EVENTHUB` |

Each deployment environment should use its corresponding database connection string.

**Important:** Do not run development seed scripts against the Atlas Production database. Keep development, Preview, and Production data isolated.

---

## Project Status

The following features are documented as implemented:

| Feature | Status |
|---|---|
| MERN application architecture | Implemented |
| User authentication and authorization | Implemented |
| Email OTP verification | Implemented |
| Password recovery | Implemented |
| Event management | Implemented |
| Booking and reservation management | Implemented |
| Reservation expiry and seat release | Implemented |
| Digital ticket generation | Implemented |
| PDF ticket delivery | Implemented |
| QR-code ticket scanning | Implemented |
| Event staff management | Implemented |
| Backend automated tests | Implemented |
| Frontend automated tests | Implemented |
| Vercel deployment | Operational |

---

## Documentation

Additional technical documentation is available in the `docs/` directory:

| Document | Purpose |
|---|---|
| `API_CONTRACT.md` | API endpoint and request/response documentation |
| `ARCHITECTURE_AND_STRUCTURE.md` | Application architecture and folder organization |
| `DATABASE_DESIGN.md` | Database design decisions |
| `DATABASE_SCHEMA.md` | Database schema details |
| `DEPLOYMENT.md` | Deployment configuration and instructions |
| `RESERVATION_POLICY.md` | Booking and reservation lifecycle rules |

---

## Contributing

Contributions and suggestions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the relevant tests and checks.
5. Submit a pull request describing your changes.

---

## Author

**Shlok Ashish Jaiswal**

- GitHub: [@shlokj2006](https://github.com/shlokj2006)
- Project: [EventHub](https://github.com/shlokj2006/EventHub)

---

## License

No license information is specified in the supplied project documentation. Add a `LICENSE` file to the repository if you intend to distribute the project under a particular open-source license.
