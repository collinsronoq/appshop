# Trip completion and purchases

Completing an active trip requires every TripItem to be collected or skipped. Collected items
produce one immutable Purchase row from requested and purchased snapshots; skipped items produce
none. Substituted items retain both identities. Purchaser attribution uses the collecting user,
and purchase time uses collection time when available. Completion locks the trip, writes all
purchases and the completed state in one transaction, and increments the trip version. A second
completion is rejected and the database enforces one purchase per TripItem.

Purchase history is household-scoped, bounded (`limit` up to 100 and `offset`), ordered newest
first, and supports product filtering. Prices are optional fixed-decimal fields without currency
logic. Completion publishes `shopping_trip.completed` after commit; publisher failure does not
roll back history. Receipt capture, recommendations, and restocking intelligence are out of scope.
