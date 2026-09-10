# UI Unit 1 — App shell and Home

## Navigation hierarchy

Authenticated users enter an Expo Router tab group with five destinations, in order: Home, Lists,
Products, History, and Profile. The tab group is nested inside the existing authenticated route
guard. Authentication and contextual flows remain outside the tab navigator. Existing URLs for
list and product detail, trip/shopping mode, invitations, purchases, purchasing memory, household
selection, and member management are retained.

Shopping mode is deliberately focused and does not render bottom navigation. Home links directly
to the active trip and notification navigation continues to target `/trip/[tripId]` with the
substitution identifier.

## Design direction and tokens

The shell uses a warm cream background, white surfaces, forest-green primary actions, pale sage
supporting surfaces, green-black primary text, and muted grey-green secondary text. It avoids heavy
gradients, glass effects, large shadows, oversized headings, and decorative grocery imagery.

`src/design/theme.ts` centralizes colors, the 4–40 spacing scale, radii, compact typography,
restrained elevation, icon sizes, and 44–48dp touch targets. `src/design/components.tsx` provides
the initial shared layer: `AppScreen`, `AppHeader`, `SectionHeader`, button variants, `IconButton`,
`SurfaceCard`, `InlineError`, `LoadingState`, `EmptyState`, `HouseholdSwitcher`, and `QuickAction`.
The generated implementation reference is stored in `01-app-shell-home-concept.png` alongside this
document.

## Home architecture

Home renders household identity immediately and loads independent sections progressively:

- active shopping is derived by checking active-trip state for the selected household's lists;
- shopping lists show a two-item preview and intentional first-list state;
- pending substitutions exclude requests created by the current user, preserving the no
  self-approval rule;
- recent and frequent purchase memory use the existing Unit 9 endpoints;
- quick actions expose new list, add product, and invite member flows.

No aggregate dashboard endpoint was added. List, substitution, recent-memory, and frequent-memory
queries begin independently. Active-trip calls begin when their required list identifiers are
available. Optional section failures render local retry controls and never collapse Home.

The sparse state uses a compact next-shop card, useful shortcuts, and explanatory memory copy; it
does not reserve large blank regions for absent data.

## Household context and privacy

All feature query keys contain the selected household identifier. Switching households cancels
in-flight queries for the outgoing household, stores the new selection through the existing
storage mechanism, and invalidates the incoming household namespace. Home content is keyed by the
selected household ID so local render state is remounted at the boundary and previous-household
content is not retained on screen.

## Safe area and responsive behavior

`AppScreen` owns the warm background, top/side safe areas, consistent horizontal gutters,
scrolling, optional keyboard avoidance, and short-screen behavior. Expo Router's tab bar owns the
bottom safe-area inset. Tab labels remain visible, icon-only controls have accessibility labels,
and foundational controls meet the minimum touch target.

## Profile migration

Profile now contains the signed-in identity, selected household summary, Members, Invite member,
Switch household, notification information, and a restrained destructive Log out row. The old
floating/dominant settings affordance is not part of the authenticated content shell.

## Remaining UI work

Later units still own full redesigns of list detail, product detail/create, shopping mode,
substitution detail, purchase history, purchasing memory/Buy Again, invitations, and detailed
settings. Unit 1 only makes those capabilities discoverable and keeps their existing routes
operational.
