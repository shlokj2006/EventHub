# Architecture and Project Structure

## High-level architecture

``` text
React frontend
     |
     | HTTP requests (Axios)
     v
Express REST API on Node.js
     |
     | Mongoose models/queries
     v
MongoDB database
```

The React application displays pages and collects user input. It sends
requests to the Express API. The backend validates input, applies
authentication and authorization, runs application logic, and uses
Mongoose to read or update MongoDB data.

## Proposed repository structure

``` text
EventHub/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── context/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/
│   ├── models/
│   │   ├── User.js
│   │   ├── Event.js
│   │   └── Registration.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── eventRoutes.js
│   │   └── registrationRoutes.js
│   ├── controllers/
│   ├── middleware/
│   ├── config/
│   ├── server.js
│   └── package.json
└── README.md
```

This is a target structure, not a requirement to create every folder
immediately. Adapt it to the tutorial's existing organization where
useful.

## Main API areas

These are conceptual API groups; exact paths and methods should be
finalized during implementation.

-   **Authentication:** registration, login, and current-user
    information
-   **Events:** list, details, create, update, and delete
-   **Registrations:** create registration, list a user's registrations,
    cancel registration, and organizer participant list
-   **Administration:** user management, event moderation, and platform
    statistics

## Backend responsibilities

-   Validate request data.
-   Authenticate protected requests.
-   Check roles and resource ownership.
-   Apply event capacity and registration rules.
-   Return consistent HTTP status codes and error messages.
-   Keep database access and request handling organized.

## Frontend responsibilities

-   Display event lists and details.
-   Provide login and registration forms.
-   Show user, organizer, and admin dashboards as appropriate.
-   Handle loading, empty, success, and error states.
-   Use route guards for user experience, while relying on the backend
    for real authorization.
