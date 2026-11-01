# EventHub Project Reference

This file preserves the project's original academic/tutorial context. Its
initial setup and role assumptions are historical; the live implementation
is summarized in [`PROJECT_OVERVIEW.md`](PROJECT_OVERVIEW.md), and API/schema
details are maintained in [`API_CONTRACT.md`](API_CONTRACT.md) and
[`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md).

## Identity and product

- **Name:** EventHub
- **Formal title:** EventHub — A MERN Event Booking and Ticketing Platform
- **Context:** B.Tech CSE project and full-stack portfolio application
- **Vision:** Event discovery, booking, event administration, and controlled
  event entry check-in.

## Current roles and core data

Roles are `user`, `event_staff`, and `admin`; public signup always creates a
`user`. There is no organizer role. Core documents are User, Event, Booking,
Ticket, EventStaffAssignment, OTP, and PasswordReset. Booking acts as the
registration record; there is no separate Registration model.

## Current project principles

- Backend authorization, price, capacity, and ticket validity are authoritative.
- Preserve legacy bookings and user relationships during future schema/data
  transitions.
- The repository includes code and tests but does not prove a production
  deployment, production database name, or database index state.
- Tutorial-era documents and diagrams are historical unless they link to the
  current contract.

## Learning resource

The selected MERN event-booking tutorial was a learning foundation, not the
current product specification. Source code and current documentation take
precedence over its earlier proposed workflow.
