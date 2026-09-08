# Unit 2 — Households, memberships, and invitations

Households are user-owned collaboration boundaries. Creating one writes the household and its owner membership in one transaction. Membership roles are `owner` and `member`; household names are trimmed, length-limited, and not globally unique.

Invitation tokens are opaque random values. Only a SHA-256 token hash is persisted, invitations are bound to normalized email addresses, and tokens expire after `HOUSEHOLD_INVITE_TTL_DAYS` (7 by default). Owners create invitations; authenticated recipients accept them. Expired, revoked, or invalid tokens cannot be used, and repeated acceptance by the same user is idempotent.

All household routes resolve the current user’s membership before returning data. Non-members receive a non-disclosing 404; members may read household and member data, while only owners may rename or invite.

The mobile app keeps household data in a dedicated TanStack Query cache. The selected household ID is non-sensitive AsyncStorage state; logout clears the query cache and selection. Zero-household users see creation onboarding, and owners get the member invitation control.

Migration `0003_households` is the single Alembic head after `0002_authentication`.
