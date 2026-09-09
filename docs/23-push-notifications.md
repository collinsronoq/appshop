# Push Notifications

Unit 10 adds asynchronous attention notifications for household substitution decisions. Realtime
remains responsible for active in-app synchronization; push is limited to
`substitution.requested`, `substitution.approved`, and `substitution.rejected`. Routine list and
trip-item activity does not generate push notifications.

## Device registration

`DevicePushToken` stores an authenticated user's Expo token, platform, optional device identifier,
enabled state, registration time, and latest success/failure timestamps. A user can own multiple
devices. `(provider, token)` is unique, so re-registration updates the existing row. If the same
device token is registered after a user change, ownership moves to the currently authenticated
user and the row is re-enabled.

The API exposes:

- `POST /api/v1/push-tokens` to register or reconcile the current Expo token.
- `DELETE /api/v1/push-tokens/{token_id}` to disable one token owned by the current user.

The mobile app reconciles a granted token after authenticated startup/login. For an undetermined
permission it first explains that notifications support replacement approvals, then lets the user
continue or open the OS prompt. Denial does not affect application behavior and the contextual
prompt is not repeated on every launch. Logout attempts to disable only the stored current-device
registration; remote failure never blocks local session and cache cleanup.

## Delivery and recipients

Domain mutations commit first, then realtime publishing is attempted, then push delivery is
attempted. Each transport is non-authoritative and independently failure-isolated.

- A new pending request goes to enabled devices belonging to all other current household members;
  the requesting shopper is excluded.
- Approval and rejection go only to enabled devices belonging to the original requester.
- Preferred-substitute application does not send a push because no approval is required.

`PushNotificationService` resolves memberships and enabled devices, builds low-sensitivity copy,
and records provider outcomes. `PushNotificationProvider` isolates transport logic. The Expo
provider batches at 100 messages, while tests inject a deterministic fake. A definitive Expo
`DeviceNotRegistered` ticket disables that token; transient provider or network failures do not.
Logs contain notification type and aggregate counts, never complete token values.

## Notification navigation

Payloads contain only notification type plus household, trip, and substitution identifiers. They
contain no credentials or canonical status. A tap waits for auth restoration and household-list
bootstrap. Navigation proceeds only if the referenced household appears in the authenticated
user's membership-backed household list; otherwise the app shows a safe unavailable message.

Before opening the active trip, the client selects the verified household and invalidates existing
household-scoped substitution and trip queries. The trip screen fetches the substitution from the
API, so a stale “approval needed” notification correctly renders an already approved or rejected
state without stale controls. Foreground OS banners are suppressed to avoid duplicating realtime
feedback.

## Operations and limitations

Expo delivery credentials and a physical development/production build are required for a manual
end-to-end delivery check. Automated tests mock native notification APIs and the push provider; no
real device is required. A useful manual check uses one shopper device and one approver device:
propose a replacement, tap the approver notification, approve it, and verify the shopper receives
the resolution notification.

Push is best-effort after commit. Unit 10 deliberately has no transactional outbox, so a process or
provider failure after a successful database commit can miss a notification. A durable outbox is a
future production-hardening concern. Unit 10 adds no notification-preference matrix, predictive
restocking, purchasing-memory alerts, AI, or receipt processing.
