# UI Unit 2 — Shopping Lists

The Lists experience now treats a shopping list as a deliberate planning surface:

- The root screen shows reusable list cards, item counts, update recency, archived lists, and active-trip progress. Creation opens the focused `/lists/new` route instead of a permanent inline form.
- List detail uses a back header, overflow actions for rename/archive, an intentional empty state, snapshot-rich item rows, item edit/remove actions, and Start/Continue Shopping states.
- Add item is a focused search flow with household-product snapshots, usual quantity, custom-item fallback, notes, and a friendly duplicate conflict message.
- Active-trip and archive constraints remain explicit: users must finish or cancel a trip before archiving.

All list and trip queries remain household-scoped and continue using the existing realtime invalidation hook. Backend contracts were not changed.
