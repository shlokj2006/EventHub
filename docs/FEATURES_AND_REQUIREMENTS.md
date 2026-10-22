# Features and Requirements

## Functional requirements

### Attendee/User

-   The system should allow a user to register and log in.
-   The user should be able to browse available events.
-   The user should be able to search for events.
-   The user should be able to filter events by supported fields.
-   The user should be able to view event details.
-   The user should be able to register for an event when registration
    is permitted.
-   The user should be able to view their registrations.
-   The user should be able to cancel a registration where cancellation
    is permitted.
-   The user should be able to manage their profile.

### Event Organizer

-   The organizer should be able to create an event.
-   The organizer should be able to edit and delete events they are
    permitted to manage.
-   The organizer should be able to provide event title, description,
    category, image, date, time, location, capacity, and registration
    deadline as supported by the final schema.
-   The organizer should be able to view registrations for their events.
-   The organizer should be able to manage participants and view event
    statistics.

### Admin

-   The admin should be able to view and manage users.
-   The admin should be able to view all events.
-   The admin should be able to remove inappropriate events.
-   The admin should be able to manage organizers.
-   The admin should be able to view registrations and platform
    statistics.

## Event information

Planned event fields: - `title` - `description` - `category` - `image` -
`organizer` - `date` - `time` - `location` - `maximumParticipants` -
`registrationCount` (if retained in the final model) -
`registrationDeadline` - `status` - `createdAt`

Possible categories include Concerts, Sports, Conferences, Workshops,
Technology, Cultural, Business, Education, Entertainment, College
Events, and Other.

## Non-functional requirements

These are proposed quality goals and should be validated during
implementation: - **Usability:** Pages and forms should be
understandable for first-time users. - **Security:** Passwords should be
hashed; protected routes and role checks should be enforced on the
server. - **Data integrity:** The backend should reject invalid
registrations and prevent event capacity from being exceeded. -
**Maintainability:** Keep models, routes, controllers, middleware, and
configuration organized. - **Reliability:** Show meaningful success and
error feedback for key actions. - **Compatibility:** Test the
application in a modern desktop browser and check responsive layouts
where practical. - **Deployability:** Keep secrets and
environment-specific configuration out of source control.

## Registration rules to implement

The backend should validate at least: - The event exists. - Registration
is still open and the deadline has not passed, if a deadline is
configured. - The event has not reached its maximum capacity. - The user
is not already registered for the same event. - The requested action is
allowed for the current user's role.

The exact rules should be aligned with the final database schema and
application behavior.

## Search and filtering ideas

Possible filters: - Category - Date - Location - Free/paid status, if
price is included in the final model - Upcoming/past status

Only implement filters that are supported by the final event model.
