# Architecture and Product Decisions

Record meaningful project decisions here. Entries below are the initial
decisions from the project plan.

## D-001: Use the MERN stack

**Decision:** Use MongoDB, Express.js, React.js, and Node.js.

**Reason:** The stack supports a JavaScript-based full-stack application
and demonstrates practical web development skills.

## D-002: Keep the platform general-purpose

**Decision:** EventHub is not limited to college events.

**Reason:** A dedicated College Events module can be added later without
restricting the main product.

## D-003: Learn from a tutorial, then customize

**Decision:** Use the selected MERN event-booking tutorial as a learning
foundation, not as the final submission unchanged.

**Reason:** The project should demonstrate understanding and original
customization.

## D-004: Build core features before advanced features

**Decision:** Implement setup, authentication, event CRUD, and
registration before QR attendance or other advanced additions.

**Reason:** A reliable, understandable core application is the priority.

## D-005: Enforce business rules on the backend

**Decision:** Capacity, authorization, and duplicate-registration checks
must be enforced server-side.

**Reason:** Frontend-only checks can be bypassed.

## Future decisions

For each new decision, record: date, context, options considered,
decision, consequences, and status.
