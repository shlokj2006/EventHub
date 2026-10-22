# Database Design

This is an initial logical design. The exact schema can change while
implementing the tutorial and adapting it to EventHub.

## 1. User

Planned fields: - `name` - `email` - `password` --- store a password
hash, not the original password - `role` - `profileImage` -
`createdAt` - `updatedAt`

Supported roles: - `user` - `organizer` - `admin`

Suggested considerations: - Validate email format. - Enforce uniqueness
for email. - Use bcrypt to hash passwords. - Do not return password
hashes in normal API responses.

## 2. Event

Planned fields: - `title` - `description` - `category` - `image` -
`organizer` --- reference to the organizer/user record - `date` -
`time` - `location` - `maximumParticipants` - `registrationDeadline` -
`status` - `createdAt`

`registrationCount` may be stored or calculated from registration
records. Choose one consistent strategy and ensure it cannot become
inaccurate.

Possible categories: - Concerts - Sports - Conferences - Workshops -
Technology - Cultural - Business - Education - Entertainment - College
Events - Other

## 3. Registration

Planned fields: - `user` --- reference to the registered user - `event`
--- reference to the event - `registrationId` - `status` -
`attendance` - `createdAt`

Potential status values should be defined in the implementation, for
example active or cancelled. Attendance behavior will depend on whether
the QR attendance feature is implemented.

## Relationships

-   One user can have many registrations.
-   One event can have many registrations.
-   One organizer can create many events.
-   Each registration links one user to one event.

## Data integrity rules

-   Prevent duplicate active registrations for the same user and event.
-   Enforce event capacity in backend logic.
-   Validate registration deadlines and event status.
-   Check authorization before an organizer changes an event.
-   Restrict admin-only operations to admin users.

For concurrency-sensitive capacity checks, do not rely only on a
frontend count. The backend must perform the authoritative check and use
an appropriate atomic or transactional strategy if required by the final
implementation.
