# Database Schema

> Initial design for EventHub. Adjust field names and types to match the
> actual Mongoose models.

## User

  Field                      Purpose
  -------------------------- -----------------------------------------------------
  `name`                     Display name
  `email`                    Unique account email
  `password`                 Password hash only; never store plaintext passwords
  `role`                     `user`, `organizer`, or `admin`
  `profileImage`             Optional profile image reference
  `createdAt`, `updatedAt`   Timestamps

## Event

  Field                    Purpose
  ------------------------ -----------------------------------------------
  `title`                  Event name
  `description`            Event description
  `category`               Event category
  `image`                  Optional event image reference
  `organizer`              Reference to the user who organizes the event
  `date`, `time`           Event schedule
  `location`               Event location
  `maximumParticipants`    Registration capacity
  `registrationDeadline`   Optional registration cutoff
  `status`                 Event lifecycle/availability status
  `createdAt`              Creation timestamp

## Registration

  Field              Purpose
  ------------------ ----------------------------------
  `user`             Reference to attendee
  `event`            Reference to event
  `registrationId`   Registration identifier
  `status`           Registration status
  `attendance`       Attendance state, if implemented
  `createdAt`        Registration timestamp

## Relationships and integrity

-   A user can create multiple registrations.
-   An event can have multiple registrations.
-   An organizer can create multiple events.
-   A registration references one user and one event.
-   Prevent duplicate active registrations.
-   Enforce capacity in backend logic, not only in the UI.
-   Consider a unique compound index for user/event if compatible with
    cancellation and re-registration rules.
