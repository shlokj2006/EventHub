# Reference Feature: Event Registration and Capacity

This document describes one core feature in implementation-neutral
terms. Match it to the final code.

## Goal

Allow an authenticated attendee to register for an event only when
registration is valid and capacity remains.

## Expected flow

1.  Attendee opens an event details page.
2.  Frontend requests registration.
3.  Backend authenticates the attendee.
4.  Backend verifies the event exists and registration is open.
5.  Backend checks the attendee is not already registered.
6.  Backend checks capacity and any configured registration deadline.
7.  Backend creates the registration and updates/calculates the
    registration count consistently.
8.  Frontend shows confirmation and the registration appears in the
    attendee's registration list.

## Validation cases

-   Event does not exist → reject.
-   User is not authenticated → reject.
-   Registration deadline has passed, if enforced → reject.
-   Event is full → reject.
-   User already has an active registration → reject.
-   Valid request with capacity available → create registration.

## Important implementation notes

-   The backend is the source of truth for capacity and registration
    validity.
-   Handle concurrent requests so two users cannot exceed the capacity
    through a race condition.
-   Do not expose password hashes or unnecessary attendee details.
-   Define cancellation and re-registration behavior before choosing
    database indexes.
-   Return clear success and error messages.

## Acceptance criteria

-   [ ] Valid registration is persisted.
-   [ ] Registration is associated with the correct user and event.
-   [ ] Duplicate registration is rejected.
-   [ ] Full event rejects new registrations.
-   [ ] Unauthorized requests are rejected.
-   [ ] UI displays the outcome clearly.
