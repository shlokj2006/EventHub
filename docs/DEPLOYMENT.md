# Deployment Plan

## Planned hosting architecture

``` text
React frontend
      |
      v
   Vercel

Node.js + Express API
      |
      v
    Render

MongoDB database
      |
      v
 MongoDB Atlas
```

These are proposed deployment options, not a claim that the project is
already deployed. Provider features, pricing, and free-tier limits may
change.

## Pre-deployment checklist

-   [ ] The frontend runs locally.
-   [ ] The backend runs locally.
-   [ ] MongoDB connection works.
-   [ ] Authentication and authorization are tested.
-   [ ] Event creation and registration work.
-   [ ] Invalid requests are handled safely.
-   [ ] Secrets are stored in environment variables.
-   [ ] `.env` is excluded from version control.
-   [ ] A safe `.env.example` documents required variable names.
-   [ ] The production frontend URL is configured for the backend.
-   [ ] The frontend API base URL points to the deployed backend.
-   [ ] CORS allows the intended frontend origin.
-   [ ] The deployed application has been tested end-to-end.

## Example environment variable names

Use names appropriate to the actual codebase. Common examples include:

``` text
MONGODB_URI=
JWT_SECRET=
PORT=
CLIENT_URL=
```

Do not put real secret values in this document, commit them to GitHub,
or paste them into public issue trackers.

## Post-deployment checks

-   Register and log in with a test account.
-   Browse event listings and open event details.
-   Test an authorized event-management action.
-   Register for an event and verify the saved registration.
-   Test capacity and duplicate-registration rules.
-   Verify that unauthorized requests fail.
-   Check the browser console and server logs for errors.
