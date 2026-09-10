# UI Unit 5 — Substitution Requests

Substitutions now have a focused shopper and approver flow:

- Shopping Mode opens an unavailable-item route with the requested snapshot, saved preferred substitute, household-product selection, custom proposal, review, send, and waiting states.
- Pending approvals are available at `/substitutions`, excluding the current requester from actionable cards. Each request opens a canonical review route with requested/proposed context and approve/reject actions.
- Review screens refetch canonical state, prevent requester self-approval in the UI, and show approved/rejected outcomes without stale controls.
- Existing household-scoped query keys, push deep links, realtime invalidation, and backend substitution semantics remain unchanged.

Photo attachment and the full approval-inbox/detail workflow can be extended when the backend exposes the corresponding upload contract; this unit keeps requests optional-photo compatible without changing storage semantics.
