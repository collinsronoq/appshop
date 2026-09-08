# User Journeys

## Journey 1 — Create Household

1. User registers.
2. User creates a household.
3. System creates owner membership.
4. User lands on household home.
5. User may invite another member.

Outcome: household workspace exists.

## Journey 2 — Join Household

1. Owner creates an invitation.
2. Invitee opens invite.
3. Invitee authenticates or registers.
4. Invite token is validated.
5. Membership is created.
6. Invite becomes accepted.
7. User can access household resources.

## Journey 3 — Add a Household Product

1. Member opens Household Products.
2. Member selects Add Product.
3. Member enters:
   - name;
   - brand;
   - variant;
   - size;
   - usual quantity;
   - category;
   - notes;
   - photo;
   - preferred substitute.
4. Product is saved.
5. Product appears in household catalogue.

## Journey 4 — Create Shopping List

1. Member creates a list.
2. Member adds products from household catalogue.
3. Member may add ad-hoc items.
4. List shows quantities and categories.
5. Other household members see changes in realtime.

## Journey 5 — Add Item While Someone Shops

1. Shopper has active trip open.
2. Another member adds an item to source list.
3. Backend commits the item.
4. Realtime event is published.
5. Shopper sees the new item.
6. Optional push notification is sent if shopper is not actively viewing the list.

## Journey 6 — Start Shopping

1. Member opens list.
2. Member taps Start Shopping.
3. Optional store name is entered.
4. Trip is created.
5. Shopping mode opens.
6. Items are grouped for convenient collection.

## Journey 7 — Collect Item

1. Shopper taps an item.
2. Shopper reviews exact product details.
3. Shopper marks item collected.
4. UI updates optimistically.
5. Backend records collection.
6. Realtime event is published.

## Journey 8 — Product Unavailable

1. Shopper opens an unavailable item.
2. Shopper selects Cannot Find.
3. If preferred substitute exists, it is shown.
4. Shopper may:
   - use substitute;
   - propose another;
   - request household approval;
   - skip.
5. If approval is requested, household receives event.
6. Another member approves or rejects.
7. Trip state updates.

## Journey 9 — Complete Shopping

1. Shopper reviews collected, skipped, and substituted items.
2. Shopper optionally enters total or item prices.
3. Shopper taps Complete Trip.
4. System validates active state.
5. Purchase records are generated.
6. Trip becomes completed.
7. Completion event is published.
8. Household sees updated history.

## Journey 10 — Build Next List from Purchase History

1. Member opens Home.
2. System shows recent and frequent products.
3. Member selects multiple products.
4. Products are added to an active list.
5. Member adjusts quantities if required.

## Future Journey — Restock Suggestion

1. System calculates purchase intervals.
2. Product approaches expected replenishment date.
3. System marks it as likely due.
4. User decides whether to add it.
5. Decision feeds later prediction quality.

The MVP stores the data required for this journey but does not implement automated prediction.
