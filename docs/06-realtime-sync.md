# Realtime Synchronization Contract

## 1. Goal

Provide responsive collaborative shopping without making WebSocket delivery the source of truth.

## 2. Transport

MVP transport:

```text
WebSocket
```

Suggested endpoint:

```text
/api/v1/realtime
```

Authentication must occur during connection establishment.

## 3. Subscriptions

Client subscribes to a specific shopping list or active trip.

Logical channel:

```text
shopping-list:{list_id}
```

The server must verify household membership before subscription.

## 4. Event Envelope

```json
{
  "event_id": "uuid",
  "type": "shopping_item.collected",
  "household_id": "uuid",
  "list_id": "uuid",
  "trip_id": "uuid",
  "resource_id": "uuid",
  "actor_id": "uuid",
  "version": 42,
  "occurred_at": "ISO-8601",
  "payload": {}
}
```

## 5. Event Types

MVP:

- shopping_list.updated
- shopping_item.added
- shopping_item.updated
- shopping_item.removed
- shopping_trip.started
- shopping_item.collected
- shopping_item.uncollected
- shopping_item.skipped
- substitution.requested
- substitution.approved
- substitution.rejected
- shopping_trip.completed
- shopping_trip.cancelled

## 6. Versioning

ShoppingList contains monotonically increasing integer:

```text
version
```

Each committed mutation that changes list/trip-visible state increments the version.

Client stores last observed version.

If:

```text
incoming_version > local_version + 1
```

client assumes an event was missed and refetches canonical state.

## 7. Reconnect

On reconnect:

1. authenticate;
2. resubscribe;
3. fetch current list/trip state;
4. replace stale local state;
5. resume event processing.

Do not attempt to replay an unbounded event history in MVP.

## 8. Optimistic Mutations

Client may optimistically:

- collect;
- uncollect;
- skip;
- adjust quantity.

If HTTP mutation fails:

- rollback or refetch;
- show non-blocking sync error;
- allow retry.

## 9. Ordering

Version number, not socket arrival order, defines state progression.

## 10. Publish Timing

Events are published only after successful database commit.

## 11. Horizontal Scaling

Future implementation may use Redis Pub/Sub or equivalent.

Define an interface such as:

```python
class RealtimePublisher:
    async def publish(self, event: RealtimeEvent) -> None:
        ...
```

Initial implementation may use in-process broadcast.
