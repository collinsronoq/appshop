# Unit 5 — Realtime collaboration

The API exposes `GET /api/v1/realtime?access_token=...` as an authenticated WebSocket. Clients send explicit `subscribe` and `unsubscribe` frames for shopping-list UUIDs. Each subscription rechecks the existing household membership boundary; archived or inaccessible lists are not subscribed.

HTTP remains the only mutation transport. After a shopping-list transaction commits, the service publishes a bounded event envelope (`event_id`, type, household/list/resource IDs, actor, resulting version, timestamp, payload). Supported events are list updated/archived and item added/updated/removed. Publication failures are isolated from committed domain writes.

The mobile list-detail hook subscribes on entry, unsubscribes on cleanup, invalidates canonical TanStack Query state for sequential events, refetches on version gaps, ignores stale/duplicate events, and reconnects with bounded backoff and resubscription. Access tokens are used only for connection authentication; refresh tokens are never sent over the socket.

The MVP manager and publisher are process-local. Run a single API process for realtime correctness; horizontal scaling requires a broker such as Redis in a future unit. No event table, Redis, shopping trips, collected state, or push notifications are included here.

Focused Unit 3 coverage for product storage, substitute integrity, and image security remains tracked technical debt and is intentionally not expanded in this realtime-only unit.
