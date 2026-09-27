# Gather — Events

An event discovery and RSVP experience built as a pnpm monorepo. The React client talks to a versioned Fastify API; a future React Native client can use the same OpenAPI contract.

## Workspace

- `apps/web` — React, TypeScript, Vite, and TanStack Query.
- `apps/api` — Fastify API with domain, application, persistence, and HTTP layers.
- `packages/api-contracts` — shared Zod request/response schemas, TypeScript types, and the checked-in OpenAPI document for clients in other repositories.
- `supabase/migrations` — schema, row-level policies, attendee-count trigger, and seed events.

## Run locally

1. Install Node.js 22.12+ and pnpm 11+.
2. Run `pnpm install` and `pnpm dev` from the repository root.
3. The web app is at `http://localhost:5173`; the API is at `http://localhost:4000` and OpenAPI docs at `/docs`.
4. Without Supabase variables the API uses seeded in-memory events and the web app offers a demo sign-in. This keeps the product reviewable before cloud credentials are configured.

To use Supabase, copy `.env.example` values into `apps/api/.env` and `apps/web/.env.local`, apply `supabase/migrations/202609260001_events.sql`, and configure Supabase Auth email magic links with Resend SMTP. Add the deployed web origin to Supabase's allowed redirect URLs. Never put a service role key in the browser.

The production API defaults to the same-origin `/api/v1` path. `VITE_API_URL` is only needed to override that path during local development.

## API

All application endpoints are under `/api/v1`:

- `GET /events` — list events; optional `q` search and `category` filter.
- `GET /events/:eventId` — event detail.
- `POST /events` — create an event (authenticated).
- `PATCH /events/:eventId` — update an owned event (authenticated).
- `POST /events/:eventId/rsvp` — RSVP (authenticated, idempotent).
- `DELETE /events/:eventId/rsvp` — cancel RSVP (authenticated).
- `GET /me/rsvps` — current user's RSVPs (authenticated).

OpenAPI is served at `/docs` and `/docs/json`, and checked in at `packages/api-contracts/openapi.json`. After changing routes or their validation schemas, regenerate the contract with `pnpm --filter @events/api export:openapi` and commit the updated JSON alongside the API change. Authenticated operations document Supabase bearer-token authentication so a client in the separate React Native repository can generate its API client from this file.

## Architecture notes

The API follows dependency direction from HTTP adapters inward to application use cases and domain rules. Repository interfaces keep the domain independent from Supabase and the demo memory adapter. The client shares only API contracts, never persistence models. OOP is used where objects own meaningful invariants; React remains composition-oriented.

## Deployment

Render deploys this repository as one Docker web service, configured by the root `render.yaml` and `Dockerfile`. The image builds the API and React app from the pnpm workspace; Fastify serves both the versioned API and the SPA from the same origin. React Router paths are served through the SPA entry point, while unknown API routes and missing static assets remain 404s. Render supplies `PORT`; the API listens on `0.0.0.0`.

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` on the Render service. The `VITE_` values are public client configuration embedded at image build time; they are not secrets. Never configure a service role key in the app. In Supabase, set the exact deployed Render URL as the Auth site URL and allow `https://<your-service>.onrender.com/auth/callback` as a redirect URL. Configure magic-link email delivery through Resend SMTP with a verified sender domain. Apply the checked-in SQL migration to the Supabase project before evaluating persistent event and RSVP flows.

Build and run the deployment image locally with `docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_ANON_KEY=... -t gather-events .` and `docker run --rm -p 10000:10000 -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... gather-events`. Omit Supabase settings to review the seeded in-memory demo. The future React Native app is a separate repo and calls the same `/api/v1` API using a Supabase access token; CORS is not required for native clients.

## Walkthrough outline

Show browsing/search, an event detail, magic-link or demo sign-in, RSVP and RSVP cancellation, then create and edit an event. Close with the package layout, API docs, and how the OpenAPI contract supports a separate mobile client.
