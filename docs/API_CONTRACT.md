# API Contract

> Draft contract for EventHub. Final routes, payloads, and status codes
> must match the implemented backend.

## Conventions

-   Base path: `/api` (proposed; confirm against the server).
-   Use JSON request and response bodies unless an endpoint requires
    otherwise.
-   Protected endpoints require valid authentication.
-   Role checks and resource ownership must be enforced by the backend.

## Authentication

  Operation      Proposed endpoint           Access
  -------------- --------------------------- ---------------
  Register       `POST /api/auth/register`   Public
  Login          `POST /api/auth/login`      Public
  Current user   `GET /api/auth/me`          Authenticated

## Events

  Operation            Proposed endpoint          Access
  -------------------- -------------------------- -----------------------------
  List/search events   `GET /api/events`          Public
  Event details        `GET /api/events/:id`      Public
  Create event         `POST /api/events`         Organizer/Admin, as defined
  Update event         `PATCH /api/events/:id`    Authorized organizer/Admin
  Delete event         `DELETE /api/events/:id`   Authorized organizer/Admin

## Registrations

  ---------------------------------------------------------------------------------------
  Operation               Proposed endpoint                       Access
  ----------------------- --------------------------------------- -----------------------
  Register for event      `POST /api/events/:id/registrations`    Authenticated attendee

  View own registrations  `GET /api/registrations/me`             Authenticated

  Cancel registration     `PATCH /api/registrations/:id/cancel`   Registration owner, if
                                                                  allowed

  View event participants `GET /api/events/:id/registrations`     Authorized
                                                                  organizer/Admin
  ---------------------------------------------------------------------------------------

## Error handling

Use consistent error responses with a human-readable message. Validate
input, reject duplicate registrations, enforce event capacity on the
server, and avoid exposing secrets or password hashes.

## To finalize

-   [ ] Confirm route names against the actual code.
-   [ ] Define exact request/response schemas.
-   [ ] Document validation errors and status codes.
-   [ ] Add pagination and filtering parameters if implemented.
