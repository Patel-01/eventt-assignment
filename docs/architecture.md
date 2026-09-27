# Architecture

## Direction

The API is the application boundary shared by web and future mobile clients. The React web app never queries Supabase tables directly. `packages/api-contracts` shares transport schemas and types, not domain or database models.

```text
apps/web ── HTTP + OpenAPI contract ──> apps/api
                                           │
                  HTTP routes → use cases → domain rules
                                           │
                              repository interface
                                           │
                             Supabase / memory adapter
```

The direction of source dependencies points inward. Routes own transport validation and response mapping. Use cases own application orchestration. Domain objects own rules that should remain true regardless of transport or persistence. Adapters implement repository interfaces at the edge.

## OOP and simplicity

- `Event` owns create/update invariants such as valid future start times and end-after-start ordering.
- `EventService` coordinates browse, create, edit, and RSVP operations through the `EventRepository` port.
- Repositories are interfaces; memory and Supabase implementations are interchangeable without changing the use case.
- Avoid a class for each file or wrapper methods with no behavior. React uses composition and hooks because UI state and rendering are naturally declarative.

## Persistence and authorization

Supabase Auth supplies signed JWTs. The API verifies the token and uses a request-scoped Supabase client with the public key plus the caller's bearer token, so Postgres RLS applies to database operations. Public reads are allowed; event writes require the authenticated owner; RSVP rows are scoped to their user. A unique `(event_id, user_id)` key makes RSVP creation idempotent. A trigger updates the public event attendee count without exposing other attendees' IDs.

The in-memory repository and demo identity are only for local/no-credentials review. They are process-local and reset when the API restarts. Production persistence requires configured Supabase URL/key and applied migration.

## Contract and API

The API is rooted at `/api/v1`; Fastify serves interactive docs at `/docs` and the OpenAPI JSON at `/docs/json`. Responses use event DTOs independent of Postgres row shapes. The mobile repository can generate its client from that contract later.

## Naming

All filenames and directories use kebab-case. Exported classes use PascalCase; values and functions use camelCase. Names should explain intent, functions stay focused, and comments are reserved for non-obvious constraints rather than restating code.
