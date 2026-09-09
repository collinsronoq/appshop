# Shopping trips and shopping mode

Unit 6 adds an execution layer over a shopping list. Starting a trip snapshots every current
list item into `trip_items`; the source list remains editable, while new items are added to an
active trip. Each trip has one active instance per list, a monotonic `version`, and item states
`pending`, `collected`, or `skipped`. Collect, skip, undo, and cancel are authenticated household
operations and publish realtime events (`shopping_trip.started`, `trip_item.*`, and
`shopping_trip.cancelled`). Historical trip snapshots are retained for cancelled trips.

API endpoints are documented by the OpenAPI schema under `/api/v1`: start and inspect trips,
inspect the active trip for a list, transition trip items, and cancel a trip. Archived lists cannot
start trips and cannot be archived while a trip is active. The mobile app exposes Start/Continue
shopping from list detail and a large-button shopping mode screen.

The migration is `0006_shopping_trips`. Conflict recovery is intentionally conservative: clients
refetch on version gaps and the backend returns stable conflict codes for duplicate active trips
and invalid transitions.
