# Technology Stack

## Frontend

  Technology                    Planned purpose
  ----------------------------- ----------------------------------------
  React.js                      Build reusable UI components and pages
  React Router                  Navigate between pages
  Axios                         Make HTTP requests to the backend API
  CSS, Bootstrap, or Tailwind   Style the interface

Choose one main styling approach for the project rather than adding
multiple frameworks without a need.

## Backend

  Technology   Planned purpose
  ------------ -----------------------------------
  Node.js      JavaScript runtime for the server
  Express.js   HTTP server and REST API routing

## Database and data modeling

  Technology   Planned purpose
  ------------ ----------------------------------------------------------
  MongoDB      Store users, events, and registrations
  Mongoose     Define schemas, validate data, and interact with MongoDB

## Authentication and security

  Technology   Planned purpose
  ------------ ------------------------------------------
  JWT          Represent an authenticated session/token
  bcrypt       Hash passwords before storing them

Authentication and authorization are different: authentication
establishes who the user is; authorization checks what that user is
allowed to do. Role checks must be enforced by the backend, not only by
hiding frontend controls.

## Development tools

-   VS Code
-   Git
-   GitHub
-   Node.js and npm

## Possible deployment services

-   **Vercel:** frontend hosting
-   **Render:** backend hosting
-   **MongoDB Atlas:** hosted MongoDB database

Free tiers and service limits can change. Check current provider limits
before deployment; this document does not guarantee that all services
will remain free.

## Configuration and secrets

Use environment variables for values such as the MongoDB connection
string, JWT secret, and frontend/backend URLs. Do not commit `.env`
files or real credentials to GitHub. Provide a safe `.env.example` with
placeholder values instead.
