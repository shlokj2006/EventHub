# EventHub --- MERN-Based Event Management and Registration Platform

EventHub is a planned general-purpose event management platform built
with the MERN stack. It is intended as a B.Tech CSE project and a
practical full-stack development portfolio project.

> **Project status:** Planning / initial setup. Features described in
> these documents are planned unless marked as completed in the project
> repository.

## Project goals

-   Let attendees discover events, view details, register, and manage
    registrations.
-   Let organizers create and manage events and view participants.
-   Provide administrative tools for managing users, events, and
    registrations.
-   Demonstrate React, Node.js, Express, MongoDB, Mongoose,
    authentication, authorization, CRUD, filtering, and deployment.

## Planned technology stack

-   **Frontend:** React.js, React Router, Axios, CSS / Bootstrap /
    Tailwind
-   **Backend:** Node.js, Express.js
-   **Database:** MongoDB, Mongoose
-   **Authentication:** JWT and bcrypt
-   **Development:** VS Code, Git, GitHub
-   **Possible deployment:** Vercel (frontend), Render (backend),
    MongoDB Atlas (database)

## Main roles

-   **Attendee/User:** Browse and search events, register, view
    registrations, cancel where permitted, and manage a profile.
-   **Organizer:** Create, edit, and delete events; set event details
    and capacity; view registrations and event statistics.
-   **Admin:** Manage users and organizers, review events, remove
    inappropriate events, and view platform statistics.

## Project documentation

-   [Project overview](docs/PROJECT_OVERVIEW.md)
-   [Features and requirements](docs/FEATURES_AND_REQUIREMENTS.md)
-   [Technology stack](docs/TECH_STACK.md)
-   [Database design](docs/DATABASE_DESIGN.md)
-   [Architecture and folder
    structure](docs/ARCHITECTURE_AND_STRUCTURE.md)
-   [Development roadmap](docs/DEVELOPMENT_ROADMAP.md)
-   [Deployment plan](docs/DEPLOYMENT.md)
-   [Testing and viva preparation](docs/TESTING_AND_VIVA.md)
-   [College project deliverables](docs/PROJECT_DELIVERABLES.md)

## Recommended implementation order

1.  Set up the development environment and run the selected tutorial
    project.
2.  Build and understand the backend, database models, routes,
    controllers, and middleware.
3.  Add authentication and role-based authorization.
4.  Implement event CRUD and registration.
5.  Build the React pages and dashboards.
6.  Customize the tutorial project into EventHub with branding, search,
    filters, and capacity rules.
7.  Test and deploy the features that have actually been implemented.
8.  Consider QR attendance and other advanced features after the core
    application works.

## Learning foundation

The selected learning resource is the YouTube tutorial **"MERN Stack
Event Booking Web App --- React, Node.js, MongoDB, JWT Auth"**:
https://www.youtube.com/watch?v=n7ii3Zcs6k0

The tutorial is a learning foundation, not the intended final
submission. The goal is to understand the code and customize the
application rather than submit a copied tutorial project.

## Important scope rule

Keep EventHub general-purpose first. A dedicated **College Events**
section can be added later. Do not begin advanced features such as QR
attendance before the basic application is running and understood.
