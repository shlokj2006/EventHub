# Testing and Viva Preparation

Use [`TEST_PLAN.md`](TEST_PLAN.md) for the current automated commands and
end-to-end checklist. Tests that use mocked models or Nodemailer are not
database or provider integration tests.

## Current manual demonstration

1. Browse/search events, register a user, and verify the account OTP.
2. Request a booking OTP and create a free or paid multi-attendee booking.
3. Demonstrate immediate free confirmation or pending paid reservation.
4. As admin, confirm the paid booking with `paid` or `not_paid`; explain that
   this is manual status recording, not gateway payment verification.
5. Download owner ticket PDFs, then scan a ticket as assigned Event Staff.
6. Show duplicate-scan rejection and the server-recorded check-in result.
7. Demonstrate password reset and Event Staff assignment scope if time allows.

Use a local/development database and test mail inbox. Do not demo with
production credentials or reveal OTPs, reset links, raw QR references, or
private user data in screenshots.

## Viva questions

### Architecture and data

1. What do MongoDB, Express, React, and Node contribute to the application?
2. How does Axios reach Express in local development and deployment?
3. Why does the backend load the current user role instead of trusting the JWT
   role claim alone?
4. Why is `Booking` the registration record rather than a separate
   `Registration` model?
5. How do a booking and its attendees map to ticket documents?

### Booking integrity

6. How is total price derived and validated?
7. How does the Event capacity claim prevent overselling?
8. What is the difference between a paid reservation and a confirmed booking?
9. Why does approval not decrement capacity again?
10. What happens when a reservation expires or is cancelled?
11. Why is the workflow recoverable but not a multi-document transaction?

### Authentication and roles

12. How do OTP verification and JWT session validation work?
13. How does password reset expire, remain single-use, and invalidate sessions?
14. What can an Event Staff user access, and how are assignments checked?
15. How does ticket ownership constrain PDF downloads?

### Tickets and future scope

16. What data is in the QR payload and where is validity decided?
17. How does the conditional check-in update suppress concurrent scans?
18. What do `paid` and `not_paid` mean today?
19. Which payment, UX, or operational features remain future work?
20. Why can mocked Nodemailer tests not prove email reached an inbox?

## Answer from current code

Do not claim an organizer role, separate registration model, payment gateway,
gateway webhook, refund, event-date ticket expiry, deployed database index, or
production deployment unless separately implemented and verified. The
production database name is unknown from repository files. See
[`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md) for limitations.
