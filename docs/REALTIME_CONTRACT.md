# Real-Time Contract

> Real-time functionality is not part of the confirmed initial scope.
> Use this file only if a live-update feature is added.

## Initial status

No real-time transport or event is specified in the current EventHub
plan. Do not add WebSockets or Socket.IO merely because this file
exists.

## Potential future use cases

If required later, real-time updates might support: - Live registration
count changes on an event page. - Organizer dashboard updates when
registrations arrive. - Attendance updates during an event.

## Contract to define before implementation

-   Transport: choose and document the actual technology (for example,
    Socket.IO) only if needed.
-   Authentication: define how clients authenticate connections.
-   Authorization: verify which event or dashboard each connected user
    may access.
-   Event names and payloads: document exact names, fields, and
    examples.
-   Failure handling: define reconnect behavior and how clients recover
    missed updates.
-   Data authority: database/API responses remain authoritative; clients
    should not trust a broadcast as proof of registration success.
-   Privacy: never broadcast personal information to users who are not
    authorized to see it.

## Readiness checklist

-   [ ] A real-time use case is confirmed.
-   [ ] Transport is selected.
-   [ ] Authentication and authorization are designed.
-   [ ] Event names and payloads are documented.
-   [ ] Reconnect and failure behavior are tested.
