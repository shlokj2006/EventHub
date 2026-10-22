# Development Roadmap

## Stage 1 --- Environment setup

-   Install/check Node.js, VS Code, and Git.
-   Prepare GitHub and MongoDB Atlas accounts if needed.
-   Start the selected MERN event-booking tutorial.
-   Create the project and confirm that the initial application runs.

**Checkpoint:** The project starts locally and the student can explain
the initial folder structure.

## Stage 2 --- Backend fundamentals

-   Set up the Express server.
-   Connect MongoDB.
-   Learn Mongoose models.
-   Understand routes, controllers, and middleware.
-   Build and test REST API endpoints.

**Checkpoint:** The backend starts reliably and basic endpoints can be
tested.

## Stage 3 --- Authentication and authorization

-   Implement registration and login.
-   Hash passwords using bcrypt.
-   Add JWT-based authentication.
-   Protect private routes.
-   Enforce the `user`, `organizer`, and `admin` roles.

**Checkpoint:** Unauthenticated and unauthorized requests are rejected
by the backend.

## Stage 4 --- Event management

-   Create event model and validation.
-   List events and view event details.
-   Implement event creation, update, and deletion.
-   Add categories.

**Checkpoint:** Authorized organizers can manage events and attendees
can browse them.

## Stage 5 --- Registration

-   Register for an event.
-   Show a user's registrations.
-   Support cancellation where permitted.
-   Enforce capacity and registration status.
-   Prevent duplicate registrations.

**Checkpoint:** Backend rules correctly reject invalid registrations.

## Stage 6 --- React frontend

-   Build navbar and homepage.
-   Add event cards and event details.
-   Build login and registration pages.
-   Add attendee, organizer, and admin dashboards.
-   Connect pages to the backend API.

**Checkpoint:** Core user journeys work through the UI.

## Stage 7 --- Customize into EventHub

-   Add EventHub branding.
-   Improve the UI.
-   Add search and filters.
-   Improve event categories and dashboards.
-   Add registration status and capacity display.

**Checkpoint:** The app reflects the EventHub project rather than
remaining an unchanged tutorial.

## Stage 8 --- Advanced features (optional)

Potential additions: - QR-based attendance - Email notifications and
reminders - Analytics - Reviews and ratings - Event recommendations -
Image uploads - College Events module

Do not begin these until the basic application works and is understood.

## Stage 9 --- Testing and deployment

-   Test normal and invalid user flows.
-   Configure environment variables.
-   Deploy the frontend and backend.
-   Configure the production database connection.
-   Test the deployed application.
-   Document known limitations.

## Learning loop

``` text
Watch a tutorial section
        ↓
Understand the purpose
        ↓
Implement it
        ↓
Test it
        ↓
Explain the code
        ↓
Customize it for EventHub
```
