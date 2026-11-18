# EventHub Frontend Documentation

This document describes the frontend currently implemented in `client/`. The
route and access table follows `client/src/App.jsx`; backend authorization
remains authoritative for protected data and operations. See
[`API_CONTRACT.md`](API_CONTRACT.md) for API request and response details.

## Architecture

The client is a React 19 single-page application bootstrapped from
`client/src/main.jsx`. `App.jsx` declares React Router routes and composes each
page with an application layout. The current source folders are:

| Folder | Responsibility |
|---|---|
| `client/src/pages/` | Route-level event discovery, account, booking, dashboard, and informational screens. |
| `client/src/components/` | Shared navigation, footer, ticket scanner, and reusable UI controls. |
| `client/src/layouts/` | Public, user, admin, and Event Staff shells; shared navigation helpers and responsive menu state. |
| `client/src/context/` | `AuthContext` and `AuthProvider`, which expose the current user and authentication actions. |
| `client/src/styles/` | Central theme tokens, typography classes, and shared control styles imported by `index.css`. |
| `client/src/utils/` | Shared Axios client/session handling, booking form helpers, scanner parsing, and authentication navigation helpers. |

Layouts use React Router's `Outlet` to render child pages. Shared primitives
(`Container`, `PageHeading`, and `Surface`) and controls (`Button`,
`FormControl`, and `Feedback`) keep page structure and interaction styling
consistent. The public `Navbar`, role-specific dashboard navigation, and
`Footer` are reused across their respective layouts.

## Application layouts

| Layout | Current use and navigation |
|---|---|
| Public (`PublicLayout`) | Public event discovery, event details, authentication, payment result, and informational pages. Includes the public navigation and shared footer. |
| User (`UserLayout`) | User dashboard, Events navigation, dashboard navigation, logout, and shared footer. |
| Admin (`AdminLayout`) | Navy sidebar on wide screens, dashboard overview and staff management links, Events navigation, logout, responsive mobile header/menu, and shared footer. |
| Event Staff (`StaffLayout`) | Staff navigation, assigned-event dashboard and ticket check-in workflow, Events navigation, logout, and shared footer. |

`RequireAuth` in `App.jsx` waits while the session is checked, sends signed-out
visitors to `/login`, and redirects a signed-in user whose role does not match
the route. It assigns `/dashboard` to `user`, `/admin` to `admin`, and `/staff`
to `event_staff`; a regular user who does not match an admin or staff route is
sent to `/`. These client guards control navigation only. Backend middleware
and resource checks enforce authorization. This documentation does not change
role permissions.

## Navigation

`Navbar` provides the public event link, authentication-aware dashboard link,
and login/register or logout controls. Dashboard layouts use shared
`LayoutNavigation` links and logout/menu controls. `NavLink` active state
styles the current destination; the public Events link also indicates active
state on `/events/:id`. The footer has its own active route indication.

At mobile widths, each shared menu button controls its corresponding
navigation element using `aria-controls` and `aria-expanded`. Selecting a link,
the brand, or logout closes the menu. `useLayoutNavigation` also closes an open
menu when Escape is pressed. At the `lg` breakpoint, public, user, and staff
navigation is displayed inline; the admin layout switches from its mobile
header/menu to its desktop sidebar. The menu button retains the `lg:hidden`
utility so responsive Tailwind display rules can control it; this avoids a
base `display` declaration on the shared button overriding its responsive
visibility.

## Design system

`client/src/styles/tokens.css` defines the shared palette and theme values.
Brand colors are:

| Color | Hex |
|---|---|
| Navy | `#233A66` |
| Light Gold | `#FFD691` |
| Muted Gold | `#D7A859` |
| Coral | `#FF6E80` |
| White | `#FFFFFF` |

The same file defines semantic page, surface, text, border, feedback, and
disabled colors; page-gutter, section, and card spacing; control/card/panel
radius; card and panel shadows; and standard/fast motion easing and duration.
It also declares reference breakpoint starts for mobile standard (`23.4375rem`),
mobile large (`26.9375rem`), tablet (`48rem`), laptop (`64rem`), desktop
(`80rem`), and wide (`100rem`). Components use Tailwind responsive utilities
where their content needs a breakpoint.

Typography preferences are Bebas Neue for display headings, DIN/DIN Next for
interface text, and Inter followed by system UI/Segoe UI fallbacks for body
text. No local font files are present in `client/src`; Bebas Neue and DIN are
font-family preferences, and browsers use an available system fallback unless
those fonts are installed externally. `typography.css` supplies shared
display, page, section, body, label, and metadata styles.

Reusable controls include button variants with loading/disabled states,
labelled input/select/textarea controls with help and error descriptions,
feedback panels for loading, empty, error, success, warning, and information
states, and the `Container`, `PageHeading`, and `Surface` layout primitives.

## Routes and access

The following routes are registered in `client/src/App.jsx`. Routes listed as
public are reachable without a signed-in session; a public page may still
display different actions based on authentication.

| Route | Page | Access | Purpose |
|---|---|---|---|
| `/` | `Home` | Public | Search and browse available events. |
| `/events/:id` | `EventDetail` | Public | View event details and, for eligible signed-in users, submit booking details. |
| `/login` | `Login` | Public | Sign in to an account. |
| `/register` | `Register` | Public | Register and complete email OTP verification. |
| `/forgot-password` | `ForgotPassword` | Public | Request password recovery. |
| `/reset-password` | `ResetPassword` | Public | Set a new password using the reset flow. |
| `/dashboard` | `UserDashboard` | `user` role | Review bookings and download available ticket PDFs. |
| `/admin` | `AdminDashboard` | `admin` role | Manage events and booking records. |
| `/admin/staff` | `StaffManagement` | `admin` role | Create/manage Event Staff accounts and event assignments. |
| `/staff` | `EventStaffDashboard` | `event_staff` role | Review assigned events and verify tickets. |
| `/payment-success` | `PaymentSuccess` | Public | Show guidance to check the current booking status. |
| `/payment-failed` | `PaymentFailed` | Public | Show guidance to review the current booking status. |
| `/about` | `About` | Public | Explain the EventHub application. |
| `/terms` | `Terms` | Public | Display draft Terms & Conditions. |
| `/privacy` | `Privacy` | Public | Display the draft Privacy Policy. |
| `*` | `NotFound` | Public | Display the not-found page for unmatched paths. |

The payment result pages are informational routes; their presence does not
represent an online payment gateway or gateway-verified payment flow.

## Footer and informational pages

The shared `Footer` is rendered by all four layouts. It contains the EventHub
brand section, Explore link, Information links, an Account section, and a
copyright/motto row. Account links show the signed-in user's role-appropriate
dashboard or login/register links for a signed-out visitor. Its grid changes
from a stacked mobile layout to columns at wider screen sizes.

The public `/about`, `/terms`, and `/privacy` routes use the shared
`InformationalPage` component. About describes event discovery, booking, and
event operations. Terms & Conditions and Privacy Policy are project-specific
draft content; both pages flag that review is required before production use.

## Responsive design and accessibility

The redesign's responsive review targets were 320px, 375px, 430px, 768px,
1024px, 1280px, 1440px, and 1920px. The document records these viewport
targets; it does not certify browser compatibility or claim a separate test
result. Global CSS sets a 320px minimum viewport width. Layouts use flexible
containers and responsive grid/stack/navigation behavior for mobile, tablet,
and desktop widths.

Implemented accessibility details include labelled navigation regions and
form controls, `aria-expanded`/`aria-controls` on menu buttons, visible
keyboard focus outlines, semantic headings/sections, and status/live feedback
for selected loading and result states. Global CSS and the button spinner
respect `prefers-reduced-motion`. These implementation details do not imply a
formal accessibility audit.

## Frontend/backend integration

`client/src/utils/axios.js` creates the shared Axios client. Its base URL is
`VITE_API_URL` when configured and `/api` otherwise. The Vite development
server proxies `/api` to `http://localhost:5000`. Use a backend API base ending
in `/api` when setting `VITE_API_URL` to a separate origin; do not put secrets
in frontend `VITE_*` variables.

The Axios request interceptor attaches the current session token as a Bearer
authorization header. `AuthContext` initializes and updates the user session,
validates an existing token through `/auth/me`, and provides login,
registration, OTP verification, and logout actions. The router uses the
context's current role for client-side protected routes. Backend authorization
remains authoritative.

The event pages use the shared API client for event discovery/details. The
event detail page submits attendee and quantity data through the booking OTP
and booking endpoints. The user dashboard loads booking history and requests
ticket PDF downloads. Admin pages manage events, booking records, and staff
assignments. The Event Staff dashboard loads assigned events; the ticket
scanner uses `@zxing/browser` to read a QR code and submits its ticket
reference to the check-in API. See [`API_CONTRACT.md`](API_CONTRACT.md) for
the existing contracts; this document does not redefine them.

## Dependencies and commands

The current declared versions are maintained in `client/package.json` and
`server/package.json`; the client includes React `^19.2.8`, Vite `^8.3.0`,
React Router DOM `^7.18.4`, Tailwind CSS `^4.3.3`, Axios `^1.20.0`, React
Icons `^5.7.0`, and `@zxing/browser` `^0.2.1`. The server declares Express
`^5.2.1`, Mongoose `^9.10.2`, and `jsonwebtoken` `^9.0.3`.

From the repository root, install dependencies and run both development
servers with:

```sh
npm run install:all
npm run dev
```

The root package also provides `npm run dev:client`, `npm run dev:server`,
`npm run build`, and `npm run lint`. For separate terminals, run
`npm run dev` from `client/` and `npm run dev` from `server/`. The server
provides `npm start` and `npm test`; frontend utility tests use `node --test`
from `client/` (there is no frontend `test` npm script). Configure backend
values using `server/.env.example` where present, and set optional frontend
`VITE_API_URL` only when using a separate API origin. Never put secrets in
frontend build-time variables.
