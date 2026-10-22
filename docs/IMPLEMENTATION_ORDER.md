# Implementation Order

Follow this order to keep the project manageable. Do not begin later
phases until the earlier phase works and is understood.

1.  **Environment setup** --- install/check Node.js, VS Code, Git, and
    prepare MongoDB Atlas if needed.
2.  **Run the tutorial baseline** --- create the project and verify it
    runs locally.
3.  **Backend foundation** --- Express server, database connection,
    models, routes, controllers, middleware.
4.  **Authentication** --- registration, login, bcrypt password hashing,
    JWT, protected routes.
5.  **Authorization** --- enforce user, organizer, and admin permissions
    on the backend.
6.  **Event CRUD** --- create, list, view, update, and delete events.
7.  **Registration workflow** --- register, view registrations, cancel
    where permitted, prevent duplicates.
8.  **Capacity and deadlines** --- validate event capacity and
    registration availability server-side.
9.  **React UI** --- homepage, event cards, event details, auth pages,
    and dashboards.
10. **EventHub customization** --- branding, search, filters,
    categories, improved user experience.
11. **Testing** --- test valid, invalid, duplicate, full-capacity, and
    unauthorized flows.
12. **Deployment** --- configure environment variables, deploy
    frontend/backend, connect production database.
13. **Optional enhancements** --- consider QR attendance and College
    Events only after the core application is stable.

For every step: understand → implement → test → explain → document.
