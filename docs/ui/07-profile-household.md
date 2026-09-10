# UI Unit 7 — Profile, Household, and Settings

Profile is now a compact administrative area answering who the user is, which household is active, and what actions are available.

- Profile shows identity, current household, role-aware members/invite/switch/rename actions, notifications, and logout.
- Members uses a compact list with role labels and a subtle “You” marker; only owners see Invite member.
- Household switching clearly marks the current selection and preserves the existing household cache boundary.
- Invitations and household rename are focused routes with validation and save states.
- Notifications exposes the current device permission/token state and uses the existing registration/unregister flow without inventing granular preferences.

Unsupported account editing, member removal/role changes, invitation revocation, and new backend settings were intentionally not added.
