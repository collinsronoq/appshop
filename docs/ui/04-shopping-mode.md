# UI Unit 4 — Shopping Mode

Shopping Mode is a focused, tab-free trip route optimized for one-handed in-store use.

- The header shows the shopping-list name, optional store, and a compact progress card with collected, remaining, and skipped counts.
- Trip items are separated into To get, Collected, and Skipped sections. Pending items expose a large one-tap Collected action plus Can’t find it? and Skip item. Resolved items remain visible with clear state color and Undo.
- Substitution links retain the existing approval semantics while making pending, approved, rejected, or unavailable states visible to the shopper.
- Completion is only available when no pending items remain. Cancel remains confirmed and reachable from the header.
- Trip and substitution queries remain household/trip scoped, with the existing realtime hook driving refetches for live additions and state changes.

Full substitution approval inbox/detail redesign remains scoped to UI Unit 5.
