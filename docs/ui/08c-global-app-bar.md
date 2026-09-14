# Global mobile app bar

This pass makes the authenticated mobile shell consistent across root and focused routes.

- `AppTopBar` has `root` and `nested` variants. Root shows `AppShop`; nested shows a back arrow and a single-line route title. Both retain the notification action and initials avatar.
- The bar owns the authenticated safe area and sits outside the route scroll view, so its white semantic surface, hairline border, and 56dp content height remain stable while content scrolls. `AppScreen` suppresses its own safe-area edges inside the shell to avoid double padding.
- The root app bar is mounted by the authenticated root layout for Home, Lists, Products, History, and Profile. The nested variant covers focused list, product, trip, purchase, household, member, invite, notification, and substitution routes discovered in the route tree.
- Existing `BackHeader` calls become content-only action slots inside the global shell, preventing duplicate back/title headers while preserving route-specific actions such as Edit, List actions, and End trip. Back behavior remains `router.back()`.
- Profile keeps the global avatar and removes the duplicate avatar from its identity card; name and email remain available in the card.
- Notifications continue to route to `/substitutions`, representing actionable household attention rather than a new general notification feed. No notification backend or unread-count infrastructure was added.
- Bottom tabs remain owned by the tab layout and are unchanged. Theme/dark mode remains intentionally deferred.

Representative emulator review targets: Home, Lists, List Detail, Products, Product Detail, History, Purchase History, Profile, Members, and Add Product.
