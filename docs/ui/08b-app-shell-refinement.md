# App shell refinement

This post-release UI pass keeps the Unit 8 visual direction while giving the authenticated tab screens a shared shell.

- Added a shared `AppTopBar` with the `AppShop` identity, Feather notification access, and a signed-in initials avatar.
- The avatar opens the Profile tab. The bell routes to the existing pending substitution approval inbox at `/substitutions`, which is the closest actionable notification destination already in the app.
- Removed Home's time-dependent greeting and kept household context as the first content section.
- Home order is household selector, Active shopping, conditional attention, Quick actions, Shopping Lists, Recently purchased, and Frequently bought. Active shopping remains visually primary and Quick Actions now precede historical memory.
- No theme control or theme functionality was added. Profile uses the compact notification-only top bar to avoid duplicating its existing identity card avatar.
- The shared bar is applied to Home, Lists, Products, History, and Profile. Focused and nested screens retain their existing back-navigation headers.

Screens targeted for Android emulator review: Home, Lists, Products, History, and Profile.
